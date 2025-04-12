import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from services.text_processing import TextProcessingService
from report.models import PlagiarismReport
from documents.models import Document
from user.models import User
from services.google_drive import GoogleDriveService
from services.text_processing import extract_text_content
import threading
import torch
from sentence_transformers import SentenceTransformer, util
import re
import spacy
import os

# Load spaCy model - use the French model since you're working with French documents
try:
    nlp = spacy.load('fr_core_news_sm')
except:
    import sys
    print("French language model not found. Install with: python -m spacy download fr_core_news_sm")
    sys.exit(1)

# Better model for French language embeddings
model = SentenceTransformer('distiluse-base-multilingual-cased-v2')

class PlagiarismDetectionService:
    """Service for detecting plagiarism between documents using different algorithms."""
    
    def __init__(self, method="embeddings", model_name=None, debug=False):
        """
        Initialize the plagiarism detection service.
        
        Args:
            method: The detection method to use ('tfidf', 'embeddings')
            model_name: The name of the embeddings model to use (only for 'embeddings' method)
            debug: Whether to print debug information
        """
        self.text_processor = TextProcessingService(debug=debug)
        self.method = method.lower()
        self.debug = debug
        
        # Lower default threshold to catch more meaningful matches
        self.default_threshold = 0.70  # Changed from 0.8 to 0.70
        
        # Minimum length for a chunk to be considered for matching
        self.min_chunk_length = 30
        
        # Skip trivial matches (common headers, punctuation, etc.)
        self.skip_trivial = True
        self.trivial_matches = ['.', ':', ',', '-', 'introduction', 'conclusion']
        
        if self.debug:
            print(f"\n[DEBUG] INITIALIZING PLAGIARISM DETECTION SERVICE")
            print(f"[DEBUG] Method: {self.method}")
            print(f"[DEBUG] Default threshold: {self.default_threshold}")
        
        # Initialize TF-IDF
        self.vectorizer = TfidfVectorizer(
            analyzer='word',
            ngram_range=(1, 3),
            stop_words='english',
            max_features=10000
        )
        
        # Initialize embeddings model if needed
        self.embedding_model = None
        
        if self.method == "embeddings":
            try:
                # Default to a multilingual model if none specified
                if not model_name:
                    model_name = "distiluse-base-multilingual-cased-v2"
                print(f"Loading embedding model: {model_name}")
                self.embedding_model = SentenceTransformer(model_name)
                print("Embedding model loaded successfully")
            except Exception as e:
                print(f"Error loading embedding model: {str(e)}")
                print("Falling back to TF-IDF method")
                self.method = "tfidf"
    
    def get_embeddings(self, texts):
        """Generate embeddings for texts based on the selected method."""
        if self.method == "embeddings" and self.embedding_model:
            try:
                # Use sentence transformer embeddings
                embeddings = self.embedding_model.encode(texts, convert_to_tensor=True)
                return embeddings
            except Exception as e:
                print(f"Error generating sentence embeddings: {str(e)}")
                # Fallback to TF-IDF if embeddings fail
                print("Falling back to TF-IDF embeddings")
        
        # Default: TF-IDF
        try:
            # Fit the vectorizer on the texts
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            return tfidf_matrix.toarray()
        except Exception as e:
            print(f"Error generating TF-IDF embeddings: {str(e)}")
            # Return simple dummy embeddings as fallback
            return np.array([np.random.random(10) for _ in texts])
    
    def _is_trivial_match(self, text):
        """Check if the chunk is a trivial match (common headers, punctuation, etc.)"""
        if not text:
            return True
            
        text_lower = text.lower().strip()
        
        # Check if it's just a single character or common header
        if len(text_lower) < self.min_chunk_length:
            return True
            
        # Check against known trivial matches
        for trivial in self.trivial_matches:
            if text_lower == trivial:
                return True
                
        # Skip chunks that are just punctuation or whitespace
        if re.match(r'^[\s\.,;:!?()-]+$', text_lower):
            return True
            
        # Skip chunks that are just numbers and punctuation
        if re.match(r'^[\s\d\.,;:!?()-]+$', text_lower):
            return True
            
        return False
    
    def calculate_similarity(self, chunks1, chunks2):
        """Calculate similarity between two sets of text chunks."""
        # Handle empty chunks
        if not chunks1 or not chunks2:
            print("Warning: Empty chunks provided for similarity calculation")
            return {
                "similarity_matrix": np.zeros((1, 1)),
                "doc1_score": 0.0,
                "doc2_score": 0.0,
                "global_score": 0.0,
                "percentage": 0.0
            }
            
        try:
            # Filter out empty chunks
            chunks1 = [chunk for chunk in chunks1 if chunk.strip()]
            chunks2 = [chunk for chunk in chunks2 if chunk.strip()]
            
            if not chunks1 or not chunks2:
                print("Warning: All chunks were empty after filtering")
                return {
                    "similarity_matrix": np.zeros((1, 1)),
                    "doc1_score": 0.0,
                    "doc2_score": 0.0,
                    "global_score": 0.0,
                    "percentage": 0.0
                }
            
            if self.debug:
                print(f"\n[DEBUG] CALCULATING SIMILARITY")
                print(f"[DEBUG] Chunks 1: {len(chunks1)} chunks")
                print(f"[DEBUG] Chunks 2: {len(chunks2)} chunks")
                print(f"[DEBUG] Method: {self.method}")
            
            # Different calculation methods based on selected approach
            if self.method == "embeddings" and self.embedding_model:
                # Get embeddings using sentence transformer
                if self.debug:
                    print("[DEBUG] Using sentence transformer embeddings")
                embeddings1 = self.embedding_model.encode(chunks1, convert_to_tensor=True)
                embeddings2 = self.embedding_model.encode(chunks2, convert_to_tensor=True)
                
                if self.debug:
                    print(f"[DEBUG] Embeddings 1 shape: {embeddings1.shape}")
                    print(f"[DEBUG] Embeddings 2 shape: {embeddings2.shape}")
                
                # Calculate similarity matrix
                sim_matrix = util.pytorch_cos_sim(embeddings1, embeddings2).cpu().numpy()
            else:
                # Default TF-IDF approach
                if self.debug:
                    print("[DEBUG] Using TF-IDF embeddings")
                all_texts = chunks1 + chunks2
                self.vectorizer.fit(all_texts)
                
                embeddings1 = self.vectorizer.transform(chunks1).toarray()
                embeddings2 = self.vectorizer.transform(chunks2).toarray()
                
                if self.debug:
                    print(f"[DEBUG] TF-IDF matrix 1 shape: {embeddings1.shape}")
                    print(f"[DEBUG] TF-IDF matrix 2 shape: {embeddings2.shape}")
                    print(f"[DEBUG] TF-IDF vocabulary size: {len(self.vectorizer.vocabulary_)}")
                
                sim_matrix = cosine_similarity(embeddings1, embeddings2)
            
            # Double-check matrix dimensions
            rows, cols = sim_matrix.shape
            if rows != len(chunks1) or cols != len(chunks2):
                print(f"Warning: Matrix shape {sim_matrix.shape} doesn't match chunks {len(chunks1)}x{len(chunks2)}")
                # Create a matrix with proper dimensions
                correct_matrix = np.zeros((len(chunks1), len(chunks2)))
                # Copy as much as we can from the original matrix
                for i in range(min(rows, len(chunks1))):
                    for j in range(min(cols, len(chunks2))):
                        correct_matrix[i, j] = sim_matrix[i, j]
                sim_matrix = correct_matrix
            
            # Calculate similarity scores
            doc1_score = np.max(sim_matrix, axis=1).mean() if sim_matrix.size > 0 else 0.0
            doc2_score = np.max(sim_matrix, axis=0).mean() if sim_matrix.size > 0 else 0.0
            
            # Global similarity score (balanced between doc1 and doc2)
            global_score = (doc1_score + doc2_score) / 2
            
            if self.debug:
                print(f"\n[DEBUG] SIMILARITY SCORES")
                print(f"[DEBUG] Document 1 score: {doc1_score:.4f}")
                print(f"[DEBUG] Document 2 score: {doc2_score:.4f}")
                print(f"[DEBUG] Global score: {global_score:.4f} ({global_score * 100:.2f}%)")
                
                # Print a small section of the similarity matrix
                print("\n[DEBUG] Similarity matrix sample (first 3x3 values):")
                for i in range(min(3, sim_matrix.shape[0])):
                    row_str = " ".join([f"{sim_matrix[i, j]:.4f}" for j in range(min(3, sim_matrix.shape[1]))])
                    print(f"[DEBUG] {row_str}")
                print("[DEBUG] ...")
            
            return {
                "similarity_matrix": sim_matrix,
                "doc1_score": float(doc1_score),
                "doc2_score": float(doc2_score),
                "global_score": float(global_score),
                "percentage": float(global_score * 100)
            }
        except Exception as e:
            print(f"Error calculating similarity: {str(e)}")
            # Return a dummy similarity result as fallback
            fallback_matrix = np.zeros((len(chunks1), len(chunks2)))
            return {
                "similarity_matrix": fallback_matrix,
                "doc1_score": 0.0,
                "doc2_score": 0.0,
                "global_score": 0.0,
                "percentage": 0.0
            }
    
    def detect_matches(self, text1, text2, sim_matrix, chunks1=None, chunks2=None, threshold=None):
        """
        Detect matching passages between documents.
        Filters out trivial matches.
        """
        if threshold is None:
            threshold = self.default_threshold
            
        if self.debug:
            print(f"\n[DEBUG] DETECTING MATCHES (threshold={threshold})")
        
        # If chunks are not provided, generate them based on method
        if chunks1 is None:
            chunks1 = self.text_processor.chunk_document_semantic(text1)
                
        if chunks2 is None:
            chunks2 = self.text_processor.chunk_document_semantic(text2)
        
        # Ensure the similarity matrix has the right dimensions
        rows, cols = sim_matrix.shape
        if rows != len(chunks1) or cols != len(chunks2):
            if self.debug:
                print(f"[DEBUG] Similarity matrix dimensions ({rows}x{cols}) don't match chunks ({len(chunks1)}x{len(chunks2)})")
            # Create a correctly sized matrix filled with zeros
            sim_matrix = np.zeros((len(chunks1), len(chunks2)))
        
        matches = []
        
        # For each pair of chunks, ensure indices are in bounds
        for i in range(min(len(chunks1), sim_matrix.shape[0])):
            # Skip trivial chunks
            if self.skip_trivial and self._is_trivial_match(chunks1[i]):
                if self.debug:
                    print(f"[DEBUG] Skipping trivial chunk from doc1: {chunks1[i][:30]}...")
                continue
                
            best_match_idx = np.argmax(sim_matrix[i])
            best_match_score = sim_matrix[i][best_match_idx]
            
            # Only consider if above threshold and not trivial
            if best_match_score >= threshold and not self._is_trivial_match(chunks2[best_match_idx]):
                matches.append({
                    "text1": chunks1[i],
                    "text2": chunks2[best_match_idx],
                    "similarity": float(best_match_score),
                    "position1": i,
                    "position2": int(best_match_idx)
                })
                
                if self.debug and len(matches) <= 3:  # Print first few matches
                    print(f"[DEBUG] Match found: {best_match_score:.4f}")
                    print(f"[DEBUG]   Doc1: {chunks1[i][:100]}..." if len(chunks1[i]) > 100 else f"[DEBUG]   Doc1: {chunks1[i]}")
                    print(f"[DEBUG]   Doc2: {chunks2[best_match_idx][:100]}..." if len(chunks2[best_match_idx]) > 100 else f"[DEBUG]   Doc2: {chunks2[best_match_idx]}")
        
        # Sort by similarity (highest first)
        matches.sort(key=lambda x: x["similarity"], reverse=True)
        
        if self.debug:
            print(f"[DEBUG] Found {len(matches)} meaningful matches above threshold {threshold}")
        
        return matches
    
    def chunk_document_for_comparison(self, text, max_chunk_size=300):
        """
        Create better chunks for comparison by:
        1. Fixing encoding issues
        2. Using a sliding window approach for more overlapping chunks
        3. Creating more chunks for better granularity
        """
        if self.debug:
            print(f"\n[DEBUG] IMPROVED CHUNKING (max_size={max_chunk_size})")
            
        # Fix encoding issues
        text = self.text_processor._fix_encoding(text)
        
        if self.debug:
            print(f"[DEBUG] Text after encoding fix: {text[:100]}..." if len(text) > 100 else text)
        
        # Get sentences with fixed encoding
        doc = nlp(text) if nlp else None
        
        if doc:
            sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
            if self.debug:
                print(f"[DEBUG] Extracted {len(sentences)} sentences")
        else:
            # Fallback to regex
            sentences = re.split(r'(?<=[.!?])\s+', text)
            
        # Create overlapping chunks using sliding window over sentences
        chunks = []
        for i in range(len(sentences)):
            current_chunk = ""
            j = i
            while j < len(sentences) and len(current_chunk) + len(sentences[j]) <= max_chunk_size:
                current_chunk += " " + sentences[j] if current_chunk else sentences[j]
                j += 1
                
            # Only add non-trivial chunks
            if len(current_chunk) > 50 and j > i:
                chunks.append(current_chunk.strip())
        
        # Ensure we have enough chunks
        if len(chunks) < 4 and len(text) > 200:
            # Fallback to character-based sliding window chunking
            window_size = min(200, len(text) // 2)
            step = window_size // 2  # 50% overlap
            
            chunks = []
            for i in range(0, len(text) - window_size + 1, step):
                chunk = text[i:i + window_size].strip()
                if chunk:
                    chunks.append(chunk)
                    
            if self.debug:
                print(f"[DEBUG] Using character-based chunking: {len(chunks)} chunks")
        
        if self.debug:
            print(f"[DEBUG] Created {len(chunks)} chunks")
            for i, chunk in enumerate(chunks[:3]):
                print(f"[DEBUG] Chunk {i}: {chunk[:100]}..." if len(chunk) > 100 else chunk)
                
        return chunks
    
    def compare_documents(self, text1, text2, chunk_size=100, overlap=50, threshold=None):
        """Compare two documents for plagiarism with improved matching."""
        if threshold is None:
            threshold = self.default_threshold
            
        if self.debug:
            print(f"\n[DEBUG] COMPARING DOCUMENTS")
            print(f"[DEBUG] Document 1 length: {len(text1)} characters")
            print(f"[DEBUG] Document 2 length: {len(text2)} characters")
            print(f"[DEBUG] Method: {self.method}")
            print(f"[DEBUG] Threshold: {threshold}")
        
        # Fix encoding in both documents
        text1 = self.text_processor._fix_encoding(text1)
        text2 = self.text_processor._fix_encoding(text2)
        
        # Use improved chunking for more granular comparison with bigger chunks for more context
        original_chunks1 = self.chunk_document_for_comparison(text1)
        original_chunks2 = self.chunk_document_for_comparison(text2)
        
        # Minimal preprocessing to maintain semantic meaning
        cleaned_chunks1 = original_chunks1.copy()
        cleaned_chunks2 = original_chunks2.copy()
        
        # Display chunking results
        if self.debug:
            print(f"\n[DEBUG] CHUNKING RESULTS")
            print(f"[DEBUG] Document 1: {len(original_chunks1)} chunks")
            print(f"[DEBUG] Document 2: {len(original_chunks2)} chunks")
            
            # Print sample chunks
            if original_chunks1:
                print(f"\n[DEBUG] Document 1 - First chunk sample:")
                print(f"[DEBUG] {original_chunks1[0][:150]}..." if len(original_chunks1[0]) > 150 else f"[DEBUG] {original_chunks1[0]}")
            if original_chunks2:
                print(f"\n[DEBUG] Document 2 - First chunk sample:")
                print(f"[DEBUG] {original_chunks2[0][:150]}..." if len(original_chunks2[0]) > 150 else f"[DEBUG] {original_chunks2[0]}")
        
        # Calculate similarity
        similarity_results = self.calculate_similarity(cleaned_chunks1, cleaned_chunks2)
        
        # Detect matches - using our improved matching algorithm
        matches = self.detect_matches(
            text1, text2, 
            similarity_results["similarity_matrix"],
            original_chunks1, original_chunks2,
            threshold
        )
        
        # Build detailed results
        return {
            "similarity_scores": {
                "doc1_score": similarity_results["doc1_score"],
                "doc2_score": similarity_results["doc2_score"],
                "global_score": similarity_results["global_score"],
                "percentage": similarity_results["percentage"]
            },
            "matches": matches,
            "stats": {
                "doc1_chunks": len(original_chunks1),
                "doc2_chunks": len(original_chunks2),
                "threshold": threshold,
                "method": self.method
            }
        }

def process_plagiarism_check(user_id, doc1_id, doc2_id, report_id, method="embeddings", debug=True):
    """Background job to process plagiarism detection with debug output."""
    try:
        print(f"\n[DEBUG] STARTING PLAGIARISM CHECK")
        print(f"[DEBUG] User ID: {user_id}")
        print(f"[DEBUG] Doc1 ID: {doc1_id}")
        print(f"[DEBUG] Doc2 ID: {doc2_id}")
        print(f"[DEBUG] Report ID: {report_id}")
        print(f"[DEBUG] Method: {method}")
        
        # Get report
        report = PlagiarismReport.get_by_id(report_id)
        if not report:
            return
        
        # Update status to processing
        report.update_status("processing")
        print("[DEBUG] Report status updated to 'processing'")
        
        # Get user 
        user = User.get_user_by_id(user_id)
        if not user or not user.google_credentials:
            report.update_status("failed")
            return
        
        doc1_id = report.document1["id"]
        doc2_id = report.document2["id"]
        
        doc1 = Document.get_document_by_file_id(doc1_id)
        doc2 = Document.get_document_by_file_id(doc2_id)
        
        if not doc1 or not doc2:
            report.update_status("failed")
            return
        
        # Download document content
        with GoogleDriveService(user.google_credentials) as drive_service:
            file1_content = drive_service.download_file(doc1_id)
            file2_content = drive_service.download_file(doc2_id)
            
            # Reset file pointers
            file1_content.seek(0)
            file2_content.seek(0)
            
            # Extract text
            text1 = extract_text_content(file1_content, doc1.get('file_type', ''), debug=debug)
            text2 = extract_text_content(file2_content, doc2.get('file_type', ''), debug=debug)
        
        print(f"\n[DEBUG] TEXT EXTRACTION COMPLETE")
        print(f"[DEBUG] Document 1 ({doc1.get('file_name', 'Unknown')}): {len(text1)} characters")
        print(f"[DEBUG] Document 2 ({doc2.get('file_name', 'Unknown')}): {len(text2)} characters")
        
        # First 100 characters of each document
        print(f"[DEBUG] Document 1 sample: {text1[:100]}..." if text1 and len(text1) > 100 else f"[DEBUG] Document 1 sample: {text1}")
        print(f"[DEBUG] Document 2 sample: {text2[:100]}..." if text2 and len(text2) > 100 else f"[DEBUG] Document 2 sample: {text2}")
        
        # Initialize plagiarism detection service with the specified method
        detector = PlagiarismDetectionService(method=method, debug=debug)
        
        # Use lower threshold to catch more meaningful matches
        results = detector.compare_documents(text1, text2, threshold=0.70)
        
        print(f"\n[DEBUG] PLAGIARISM CHECK COMPLETE")
        print(f"[DEBUG] Similarity score: {results['similarity_scores']['percentage']:.2f}%")
        print(f"[DEBUG] Matched chunks: {len(results['matches'])}")
        
        # Update report with results
        report.update_results(results)
        print("[DEBUG] Results saved to database")
        
    except Exception as e:
        # Update report status to failed
        if report:
            report.update_status("failed")
        print(f"[DEBUG] ERROR in plagiarism check: {str(e)}")

def start_plagiarism_check_task(user_id, doc1_id, doc2_id, report_id, method="embeddings"):
    """Starts the plagiarism check in a background thread."""
    thread = threading.Thread(
        target=process_plagiarism_check,
        args=(str(user_id), doc1_id, doc2_id, report_id, method, True)  # Added debug=True
    )
    thread.daemon = True  # Thread will exit when main program exits
    thread.start()
    return thread

