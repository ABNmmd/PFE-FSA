import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from services.text_processing import TextProcessingService, extract_text_content
from report.models import PlagiarismReport
from documents.models import Document
from user.models import User
from services.google_drive import GoogleDriveService
import torch
from sentence_transformers import SentenceTransformer, util
import re
import spacy
import os
import requests
from urllib.parse import quote_plus
import logging
from io import BytesIO
import yake

# Academic API configs
CORE_API_KEY = os.getenv("CORE_API_KEY")
CORE_API_URL = os.getenv("CORE_API_URL", "https://api.core.ac.uk/v3/search/works")
OPENALEX_API_URL = os.getenv("OPENALEX_API_URL", "https://api.openalex.org/works")
ACADEMIC_FETCH_LIMIT = int(os.getenv("ACADEMIC_FETCH_LIMIT", 5))

# Load spaCy model - use the French model since you're working with French documents
try:
    nlp = spacy.load('fr_core_news_sm')
except:
    import sys
    print("French language model not found. Install with: python -m spacy download fr_core_news_sm")
    sys.exit(1)

# model = SentenceTransformer('distiluse-base-multilingual-cased-v2')
model = SentenceTransformer('all-MiniLM-L6-v2')

# configure logger to write API responses to a file
logger = logging.getLogger(__name__)
if not logger.handlers:
    logger.setLevel(logging.DEBUG)
    fh = logging.FileHandler('academic_api.log', encoding='utf-8')
    fh.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    fh.setFormatter(formatter)
    logger.addHandler(fh)

class PlagiarismDetectionService:
    """Base service for detecting plagiarism between documents."""
    
    def __init__(self, method="embeddings", model_name=None, debug=False):
        """Initialize the plagiarism detection service."""
        self.text_processor = TextProcessingService(debug=debug)
        self.method = method.lower()
        self.debug = debug
        self.default_threshold = 0.70
        self.min_chunk_length = 30
        self.skip_trivial = True
        self.trivial_matches = ['.', ':', ',', '-', 'introduction', 'conclusion']
        
        if self.debug:
            print(f"\n[DEBUG] INITIALIZING PLAGIARISM DETECTION SERVICE")
            print(f"[DEBUG] Method: {self.method}")
            
        # Initialize TF-IDF vectorizer for French only
        self.french_stopwords = list(nlp.Defaults.stop_words)
        self.vectorizer = TfidfVectorizer(
            analyzer='word',
            ngram_range=(1, 3),
            stop_words=self.french_stopwords,  # French stopwords only
            max_features=10000,
            decode_error='replace'
        )
        
        # Initialize embedding model
        self.embedding_model = None
        if self.method == "embeddings":
            try:
                if not model_name:
                    model_name = "all-MiniLM-L6-v2"
                print(f"Loading embedding model: {model_name}")
                self.embedding_model = SentenceTransformer(model_name)
                print("Embedding model loaded successfully")
            except Exception as e:
                print(f"Error loading embedding model: {str(e)}")
                self.method = "tfidf"
        
        # YAKE will be used for keyphrase extraction
        self.keybert = None

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
            # Filter out empty chunks and sanitize Unicode characters for both methods
            chunks1 = [self._sanitize_text(chunk) for chunk in chunks1 if chunk.strip()]
            chunks2 = [self._sanitize_text(chunk) for chunk in chunks2 if chunk.strip()]
            
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
                # Get embeddings using sentence transformer with safe encoding
                if self.debug:
                    print("[DEBUG] Using sentence transformer embeddings")
                try:
                    # Handle smaller batches to avoid memory issues
                    embeddings1 = self._safe_encode(chunks1)
                    embeddings2 = self._safe_encode(chunks2)
                    
                    if self.debug:
                        print(f"[DEBUG] Embeddings 1 shape: {embeddings1.shape}")
                        print(f"[DEBUG] Embeddings 2 shape: {embeddings2.shape}")
                    
                    # Calculate similarity matrix
                    sim_matrix = util.pytorch_cos_sim(embeddings1, embeddings2).cpu().numpy()
                except Exception as emb_error:
                    if self.debug:
                        print(f"[DEBUG] Embedding error: {str(emb_error)}")
                    # Create fallback similarity matrix
                    sim_matrix = np.zeros((len(chunks1), len(chunks2)))
                    # Set diagonal to moderate similarity as fallback
                    for i in range(min(len(chunks1), len(chunks2))):
                        sim_matrix[i, i] = 0.5
            else:
                if self.debug:
                    print("[DEBUG] Using TF-IDF embeddings")
                
                try:
                    all_texts = chunks1 + chunks2
                    self.vectorizer = TfidfVectorizer(
                        analyzer='word',
                        ngram_range=(1, 3),
                        stop_words=self.french_stopwords,  # French stopwords only
                        max_features=10000,
                        decode_error='replace'  # Handle encoding errors by replacing with U+FFFD
                    )
                    
                    # Fit the vectorizer with explicit error handling
                    self.vectorizer.fit(all_texts)
                    
                    # Transform with additional error handling
                    embeddings1 = self._safe_transform(chunks1)
                    embeddings2 = self._safe_transform(chunks2)
                    
                    if self.debug:
                        print(f"[DEBUG] TF-IDF matrix 1 shape: {embeddings1.shape}")
                        print(f"[DEBUG] TF-IDF matrix 2 shape: {embeddings2.shape}")
                        print(f"[DEBUG] TF-IDF vocabulary size: {len(self.vectorizer.vocabulary_)}")
                    
                    sim_matrix = cosine_similarity(embeddings1, embeddings2)
                except Exception as tfidf_error:
                    if self.debug:
                        print(f"[DEBUG] TF-IDF error: {str(tfidf_error)}")
                    # Create fallback similarity matrix
                    sim_matrix = np.zeros((len(chunks1), len(chunks2)))
                    # Set diagonal to low similarity to avoid false positives
                    for i in range(min(len(chunks1), len(chunks2))):
                        sim_matrix[i, i] = 0.1
            
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
    
    def _safe_transform(self, chunks):
        """Safely transform chunks to TF-IDF vectors with error handling."""
        try:
            return self.vectorizer.transform(chunks).toarray()
        except Exception as e:
            print(f"Error in TF-IDF transform: {str(e)}")
            # Create empty vectors as fallback
            return np.zeros((len(chunks), len(self.vectorizer.vocabulary_)))
    
    def _sanitize_for_tfidf(self, text):
        """Sanitize text for TF-IDF processing to avoid encoding errors."""
        if not text:
            return ""
        
        try:
            # Replace problematic Unicode and surrogate pairs
            text = text.encode('ascii', errors='replace').decode('ascii', errors='replace')
            # Remove any remaining non-ASCII characters
            text = ''.join(c for c in text if ord(c) < 128)
            return text
        except Exception as e:
            # If all else fails, return a simplified version
            return re.sub(r'[^\x00-\x7F]+', ' ', text)
    
    def _safe_encode(self, chunks, batch_size=32):
        """Safely encode text chunks using the embedding model with error handling."""
        if not chunks:
            return torch.zeros((0, self.embedding_model.get_sentence_embedding_dimension()))
            
        results = []
        # Process in smaller batches to avoid memory issues
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i+batch_size]
            try:
                batch_embedding = self.embedding_model.encode(batch, convert_to_tensor=True)
                results.append(batch_embedding)
            except Exception as e:
                if self.debug:
                    print(f"[DEBUG] Error encoding batch {i//batch_size + 1}: {str(e)}")
                # Create fallback embeddings for this batch
                fallback = torch.zeros((len(batch), self.embedding_model.get_sentence_embedding_dimension()))
                results.append(fallback)
        
        # Combine all batch results
        if len(results) == 1:
            return results[0]
        return torch.cat(results, dim=0)
    
    def _sanitize_text(self, text):
        """Sanitize text for both TF-IDF and embedding processing."""
        if not text:
            return ""
        
        # For TF-IDF method, do strict ASCII conversion    
        if self.method == "tfidf":
            return self._sanitize_for_tfidf(text)
        
        # For embeddings, do a more gentle cleaning that preserves meaningful Unicode
        try:
            # Replace only problematic Unicode chars while keeping most international characters
            text = text.encode('utf-8', errors='replace').decode('utf-8', errors='replace')
            
            # Remove surrogates but keep normal international characters
            text = ''.join(c for c in text if not (0xD800 <= ord(c) <= 0xDFFF))
            
            # Clean some special Unicode that might cause issues
            text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
            
            return text
        except Exception as e:
            # If all cleaning fails, do basic filtering
            return re.sub(r'[^\w\s.,?!-]', ' ', text)
    
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
    
    def compare_documents(self, text1, text2, threshold=None):
        """Compare two documents for plagiarism."""
        if threshold is None:
            threshold = self.default_threshold
            
        if self.debug:
            print(f"\n[DEBUG] COMPARING DOCUMENTS")
            print(f"[DEBUG] Document 1 length: {len(text1)} characters")
            print(f"[DEBUG] Document 2 length: {len(text2)} characters")
            print(f"[DEBUG] Method: {self.method}")
            print(f"[DEBUG] Threshold: {threshold}")
        
        # Fix encoding in both documents for all methods
        text1 = self._sanitize_text(text1)
        text2 = self._sanitize_text(text2)
        
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
                print(f"[DEBUG] Document 2 - First chunk sample:")
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

    def get_chunks_and_vectors(self, text):
        """
        Compute and return chunks and their embeddings/vectors for the given text.
        This is used to avoid recomputing them for every comparison.
        """
        chunks = self.chunk_document_for_comparison(text)
        if self.method == "embeddings" and self.embedding_model:
            vectors = self._safe_encode(chunks)
        else:
            self.vectorizer.fit(chunks)
            vectors = self._safe_transform(chunks)
        return chunks, vectors

    def check_against_user_documents(self, user_id, doc_id, text, report, threshold):
        """Check document against user's other documents, optimizing chunk/embedding reuse."""
        print(f"[DEBUG] Checking against user documents")

        # Compute chunks and vectors for the target document ONCE
        target_chunks, target_vectors = self.get_chunks_and_vectors(text)

        documents = Document.get_documents_by_user_id(user_id)
        documents = [doc for doc in documents if doc.get('file_id') != doc_id]

        if not documents:
            report.update_source_result("user_documents", {
                "similarity_score": 0,
                "matches_found": 0,
                "matched_documents": []
            })
            return

        matches_by_doc = []
        highest_similarity = 0

        for doc in documents:
            try:
                with GoogleDriveService(User.get_user_by_id(user_id).google_credentials) as drive_service:
                    file_content = drive_service.download_file(doc.get('file_id'))
                    file_content.seek(0)
                    compare_text = extract_text_content(file_content, doc.get('file_type', ''), debug=False)

                # Compute chunks and vectors for the compared document
                compare_chunks, compare_vectors = self.get_chunks_and_vectors(compare_text)

                # Calculate similarity using precomputed vectors
                if self.method == "embeddings" and self.embedding_model:
                    sim_matrix = util.pytorch_cos_sim(target_vectors, compare_vectors).cpu().numpy()
                else:
                    sim_matrix = cosine_similarity(target_vectors, compare_vectors)

                similarity_results = {
                    "similarity_matrix": sim_matrix,
                    "doc1_score": float(np.max(sim_matrix, axis=1).mean()) if sim_matrix.size > 0 else 0.0,
                    "doc2_score": float(np.max(sim_matrix, axis=0).mean()) if sim_matrix.size > 0 else 0.0,
                    "global_score": 0.0,
                    "percentage": 0.0
                }
                similarity_results["global_score"] = (similarity_results["doc1_score"] + similarity_results["doc2_score"]) / 2
                similarity_results["percentage"] = similarity_results["global_score"] * 100

                similarity = similarity_results['percentage']
                if similarity > highest_similarity:
                    highest_similarity = similarity

                matches = self.detect_matches(
                    text, compare_text, sim_matrix, target_chunks, compare_chunks, threshold
                )

                if matches:
                    matches_by_doc.append({
                        "document": {
                            "id": doc.get('file_id'),
                            "name": doc.get('file_name'),
                            "type": doc.get('file_type', '')
                        },
                        "similarity": similarity,
                        "match_count": len(matches),
                        "matches": matches[:5]
                    })
            except Exception as e:
                print(f"[DEBUG] Error comparing with document {doc.get('file_name')}: {str(e)}")

        report.update_source_result("user_documents", {
            "similarity_score": highest_similarity,
            "matches_found": sum(doc["match_count"] for doc in matches_by_doc),
            "matched_documents": matches_by_doc
        })

        print(f"[DEBUG] User documents check complete. Found {len(matches_by_doc)} documents with matches.")

    def check_against_web_sources(self, text, report, threshold):
        """Check document against web sources using Google Search, optimizing chunk/embedding reuse."""
        print(f"[DEBUG] Checking against web sources")

        # Compute chunks and vectors for the target document ONCE
        target_chunks, target_vectors = self.get_chunks_and_vectors(text)
        if len(target_chunks) > 5:
            target_chunks = target_chunks[:5]
            if self.method == "embeddings" and self.embedding_model:
                target_vectors = target_vectors[:5]
            else:
                target_vectors = target_vectors[:5]

        matches_by_url = {}
        highest_similarity = 0

        for idx, chunk in enumerate(target_chunks):
            if len(chunk) < 100:
                continue

            try:
                search_results = self._search_web_for_text(chunk)
                for result in search_results:
                    url = result.get('link')
                    title = result.get('title', '')
                    snippet = result.get('snippet', '')

                    # Compute vector for the snippet
                    snippet_chunks, snippet_vectors = self.get_chunks_and_vectors(snippet)
                    if self.method == "embeddings" and self.embedding_model:
                        sim_matrix = util.pytorch_cos_sim(
                            target_vectors[idx:idx+1], snippet_vectors
                        ).cpu().numpy()
                    else:
                        sim_matrix = cosine_similarity(
                            target_vectors[idx:idx+1], snippet_vectors
                        )

                    similarity = float(np.max(sim_matrix)) if sim_matrix.size > 0 else 0.0

                    if url not in matches_by_url or similarity > matches_by_url[url]['similarity']:
                        matches_by_url[url] = {
                            "url": url,
                            "title": title,
                            "similarity": similarity,
                            "matches": [{
                                "text1": chunk,
                                "text2": snippet,
                                "similarity": similarity
                            }]
                        }
                        if similarity > highest_similarity:
                            highest_similarity = similarity
            except Exception as e:
                print(f"[DEBUG] Error searching web for chunk: {str(e)}")

        web_matches = list(matches_by_url.values())
        web_matches.sort(key=lambda x: x['similarity'], reverse=True)

        report.update_source_result("web", {
            "similarity_score": highest_similarity,
            "matches_found": len(web_matches),
            "matched_sources": web_matches[:10]
        })

        print(f"[DEBUG] Web sources check complete. Found {len(web_matches)} sources with matches.")

    def check_against_academic_sources(self, text, report, threshold, user):
        """Check document against academic sources using CORE and OpenAlex."""
        if self.debug:
            print("[DEBUG] Checking against academic sources")
        # Build a focused query via noun-chunk keyphrases
        try:
            keyphrases = self._extract_keyphrases(text)
            query = " ".join(keyphrases) if keyphrases else text[:100]
        except Exception:
            query = text[:100]
        if self.debug:
            print(f"[DEBUG] Academic query: '{query}'")
        # Fetch from CORE API
        academic_results = []
        highest_score_pct = 0.0
        try:
            if CORE_API_KEY:
                # include language filter for French
                params = {"q": query, "limit": ACADEMIC_FETCH_LIMIT, "language": "fr"}
                headers = {"Authorization": f"apiKey {CORE_API_KEY}"}
                if self.debug:
                    logger.debug(f"CORE API request params: {params}")
                resp = requests.get(CORE_API_URL, params=params, headers=headers)
                if self.debug:
                    logger.debug(f"CORE API URL: {resp.url}")
                    logger.debug(f"CORE API status: {resp.status_code}")
                data = resp.json()
                if self.debug:
                    logger.debug(f"CORE API response: {data}")
                for item in data.get("results", [])[:ACADEMIC_FETCH_LIMIT]:
                    # only skip if language is explicitly non-French
                    lang_info = item.get("language")
                    if lang_info and lang_info.get("code", "").lower() != "fr":
                        continue
                    title = item.get("title")
                    snippet = item.get("abstract") or ""
                    # include direct downloadUrl if available
                    download_url = item.get("downloadUrl") or None
                    if self.debug and download_url:
                        logger.debug(f"Found downloadUrl field: {download_url}")
                    for link in item.get('links', []):
                        if link.get('type') == 'download':
                            download_url = link.get('url')
                            break
                    if not download_url:
                        for u in item.get('sourceFulltextUrls', []):
                            download_url = u
                            break
                    url = download_url or item.get("link") or item.get("id")
                    academic_results.append({"title": title, "text": snippet, "url": url, "download_url": download_url})
        except Exception as e:
            if self.debug:
                logger.debug(f"Error fetching CORE API: {e}")
        # Fetch from OpenAlex API
        try:
            # include French-language filter for OpenAlex
            params_oa = {"search": query, "per_page": ACADEMIC_FETCH_LIMIT, "filter": "language:fr", "mailto": user.email}
            if self.debug:
                logger.debug(f"OpenAlex API request params: {params_oa}")
            resp_oa = requests.get(OPENALEX_API_URL, params=params_oa)
            if self.debug:
                logger.debug(f"OpenAlex API URL: {resp_oa.url}")
                logger.debug(f"OpenAlex status: {resp_oa.status_code}")
            data_oa = resp_oa.json()
            if self.debug:
                logger.debug(f"OpenAlex API response: {data_oa}")
            for item in data_oa.get("results", [])[:ACADEMIC_FETCH_LIMIT]:
                # filter out non-French papers
                lang_oa = item.get('lang') or item.get('language')
                if isinstance(lang_oa, str) and lang_oa.lower() != 'fr':
                    continue
                # apply recency filter
                pub_date = item.get('publication_date', '')
                title = item.get("title")
                snippet = item.get("abstract") or ""
                # Determine download URL from primary_location or open_access
                download_url = None
                primary = item.get("primary_location", {}) or {}
                if primary.get("pdf_url"):
                    download_url = primary.get("pdf_url")
                elif item.get("open_access", {}).get("oa_url"):
                    download_url = item.get("open_access").get("oa_url")
                # Prefer download_url as access URL, else DOI or ID
                doi = item.get("doi")
                if download_url:
                    url = download_url
                elif doi:
                    # DOI may already be a full URL
                    url = doi if doi.lower().startswith("http") else f"https://doi.org/{doi}"
                else:
                    url = item.get("id")
                academic_results.append({"title": title, "text": snippet, "url": url, "download_url": download_url})
        except Exception as e:
            if self.debug:
                logger.debug(f"Error fetching OpenAlex API: {e}")
        # Pre-filter by snippet similarity to avoid full-text extraction on weak hits
        if self.method == 'embeddings' and self.embedding_model:
            # compute document embedding
            doc_embed = self.embedding_model.encode(text, convert_to_tensor=True)
            for r in academic_results:
                snip = r.get('text', '')
                if snip:
                    emb_snip = self.embedding_model.encode(snip, convert_to_tensor=True)
                    r['snippet_sim'] = util.pytorch_cos_sim(doc_embed, emb_snip.unsqueeze(0)).item()
                else:
                    r['snippet_sim'] = 0.0
            academic_results.sort(key=lambda x: x.get('snippet_sim', 0), reverse=True)
        # Only process top results for detailed comparison
        academic_results = academic_results[:min(ACADEMIC_FETCH_LIMIT, 3)]
        # Use a slightly lower threshold for academic full-text matching
        academic_thresh = threshold * 0.8
        # Compute similarities for academic results using full-text extraction (percentage)
        matches = []
        highest_score_pct = 0.0
        for res in academic_results:
            # attempt to load full text from PDF if possible; skip download failures
            text2_full = ""
            if res.get("download_url"):
                if self.debug:
                    logger.debug(f"Attempting PDF download: {res['download_url']}")
                try:
                    rpdf = requests.get(res["download_url"], timeout=10)
                    content_type = rpdf.headers.get('Content-Type', '')
                    if rpdf.status_code == 200 and 'application/pdf' in content_type:
                        text2_full = extract_text_content(BytesIO(rpdf.content), 'pdf', debug=False)
                        if self.debug:
                            logger.debug(f"Extracted {len(text2_full)} chars from academic PDF")
                    else:
                        if self.debug:
                            logger.debug(f"Skipping PDF download; status {rpdf.status_code}, content-type {content_type}")
                except Exception as e:
                    if self.debug:
                        logger.debug(f"Error downloading PDF {res['download_url']}: {e}")
            # fallback to abstract snippet if no full text
            if not text2_full and res.get("text"):
                text2_full = res.get("text")
                if self.debug:
                    logger.debug(f"Using snippet fallback, length: {len(text2_full)}")
            # skip if still no content
            if not text2_full:
                if self.debug:
                    logger.debug(f"Skipping academic result with no retrievable text: {res.get('url')}")
                continue
            # chunk both documents for comparison
            chunks1 = self.chunk_document_for_comparison(text)
            chunks2 = self.chunk_document_for_comparison(text2_full)
            # compute similarity info (includes percentage)
            sim_info = self.calculate_similarity(chunks1, chunks2)
            sim_pct = sim_info.get('percentage', 0.0)
            # apply academic threshold to filter matches
            if sim_pct < academic_thresh:
                continue
            matches.append({"title": res.get("title"), "url": res.get("url"), "similarity": sim_pct})
            if sim_pct > highest_score_pct:
                highest_score_pct = sim_pct

        # Sort matches
        matches.sort(key=lambda x: x["similarity"], reverse=True)
        # Update report
        report.update_source_result("academic", {
            "similarity_score": highest_score_pct,
            "matches_found": len(matches),
            "matched_sources": matches[:10]
        })
    
    def process_document_check(self, user_id, doc_id, report, threshold, sources=None, method="embeddings"):
        """Core processing function for checking a document against sources."""
        try:
            # Get user
            user = User.get_user_by_id(user_id)
            if not user or not user.google_credentials:
                report.update_status("failed")
                print("[DEBUG] User not found or no Google credentials")
                return
            
            # Get document
            document = Document.get_document_by_file_id(doc_id)
            if not document:
                report.update_status("failed")
                print("[DEBUG] Document not found")
                return
            
            # Download and extract document text
            with GoogleDriveService(user.google_credentials) as drive_service:
                file_content = drive_service.download_file(doc_id)
                file_content.seek(0)
                text = extract_text_content(file_content, document.get('file_type', ''), debug=True)
            
            print(f"[DEBUG] Extracted {len(text)} characters from document")
            
            # Check against each source
            if "user_documents" in sources:
                self.check_against_user_documents(user_id, doc_id, text, report, threshold)
                
            if "web" in sources:
                self.check_against_web_sources(text, report, threshold)
                
            # Always perform academic check when selected
            if "academic" in sources:
                if self.debug:
                    print("[DEBUG] Invoking academic sources check")
                self.check_against_academic_sources(text, report, threshold, user)
        
        except Exception as e:
            print(f"[DEBUG] Error processing document check: {str(e)}")
            if report:
                report.update_status("failed")
    
    def process_comparison(self, user_id, doc1_id, doc2_id, report):
        """Core processing function for direct document comparison."""
        try:
            # Get user
            user = User.get_user_by_id(user_id)
            if not user or not user.google_credentials:
                report.update_status("failed")
                return
            
            # Get document IDs from report
            doc1_id = report.document1["id"]
            doc2_id = report.document2["id"]
            
            # Get documents
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
                text1 = extract_text_content(file1_content, doc1.get('file_type', ''), debug=True)
                text2 = extract_text_content(file2_content, doc2.get('file_type', ''), debug=True)
            
            # Compare documents
            results = self.compare_documents(text1, text2, threshold=0.70)
            
            # Update report with results
            report.update_results(results)
            
        except Exception as e:
            print(f"[DEBUG] Error processing comparison: {str(e)}")
            if report:
                report.update_status("failed")

    def _search_web_for_text(self, text, max_results=5):
        """Search the web for text using Google Search API."""
        try:
            api_key = os.getenv("GOOGLE_SEARCH_API_KEY")
            cx = os.getenv("GOOGLE_SEARCH_CX")  # Custom search engine ID
            if not api_key or not cx:
                print("[DEBUG] Google Search API key or CX not found")
                return []
            # Prepare search query (limit to reasonable length)
            if len(text) > 500:
                text = text[:500]
            query = quote_plus(text)
            url = f"https://www.googleapis.com/customsearch/v1?key={api_key}&cx={cx}&q={query}"
            response = requests.get(url)
            if response.status_code != 200:
                print(f"[DEBUG] Google Search API error: {response.status_code}")
                return []
            data = response.json()
            return data.get('items', [])
        except Exception as e:
            print(f"[DEBUG] Web search error: {str(e)}")
            return []

    def _extract_keyphrases(self, text, top_n=5):
        """Extract top N keyphrases via YAKE and spaCy noun-chunks."""
        # Use YAKE for keyphrase extraction
        try:
            kw_extractor = yake.KeywordExtractor(lan="fr", n=2, top=top_n)
            keywords = kw_extractor.extract_keywords(text)
            candidates = [kw for kw, score in keywords]
        except Exception:
            candidates = []
        # Fallback to spaCy noun-chunks if needed
        if len(candidates) < top_n:
            doc = nlp(text if len(text) < 10000 else text[:10000])
            for chunk in doc.noun_chunks:
                ph = chunk.text.lower().strip()
                if ph and ph not in candidates:
                    candidates.append(ph)
                    if len(candidates) >= top_n:
                        break
        return candidates[:top_n]

from services.plagiarism_coordinator import start_plagiarism_check_task, start_general_plagiarism_check
