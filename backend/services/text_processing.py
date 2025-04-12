import re
import spacy
import os
import io

# Optional imports with fallbacks
try:
    from langdetect import detect
except ImportError:
    print("Warning: langdetect not installed. Language detection disabled.")
    def detect(text):
        return 'fr'  # Default to French

# Document processing libraries - handle missing dependencies
pdf_support = True
docx_support = True
textract_support = True

try:
    import PyPDF2
except ImportError:
    print("Warning: PyPDF2 not installed. PDF processing will be limited.")
    pdf_support = False

try:
    import docx
except ImportError:
    print("Warning: python-docx not installed. DOCX processing will be limited.")
    docx_support = False

try:
    import textract
except ImportError:
    print("Warning: textract not installed. Advanced document processing will be limited.")
    textract_support = False

# Load spaCy model - use the French model since we're working with French documents
try:
    nlp = spacy.load('fr_core_news_sm')
except:
    try:
        # Try to load a basic model if French is not available
        nlp = spacy.load('en_core_web_sm')
        print("Warning: French model not found, using English model instead.")
    except:
        print("Warning: No spaCy model found. Using basic text processing.")
        nlp = None

class TextProcessingService:
    """Service for processing text before plagiarism detection."""
    
    def __init__(self, debug=False):
        """Initialize the text processing service."""
        self.stopwords = set()
        self.debug = debug  # Debug flag to control print statements
        # Minimum meaningful chunk length (to avoid matching single words/punctuation)
        self.min_chunk_length = 25  # Characters
        # Minimum sentence length to consider (to avoid matching trivial sentences)
        self.min_sentence_length = 15  # Characters
    
    def preprocess_text(self, text):
        """Clean and preprocess text."""
        if not text:
            return ""
            
        # Fix encoding issues first
        text = self._fix_encoding(text)
            
        # Convert to lowercase and remove extra whitespace
        text = text.lower()
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove special characters, keeping only letters, numbers and basic punctuation
        text = re.sub(r'[^\w\s.,?!-]', '', text)
        
        return text
    
    def _fix_encoding(self, text):
        """Fix common encoding issues, especially with French text"""
        # Common encoding replacements for French
        replacements = {
            'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã«': 'ë',
            'Ã¢': 'â', 'Ã®': 'î', 'Ã´': 'ô', 'Ã»': 'û',
            'Ã¹': 'ù', 'Ã§': 'ç', 'Ã¯': 'ï', 'Ã¤': 'ä',
            'Ã¶': 'ö', 'Ã¼': 'ü', 'Ã': 'À', 'â\x80\x99': "'",
            'â\x80\x93': "-", 'â\x80\x94': "-", 'â\x80\x9c': '"', 'â\x80\x9d': '"'
        }
        
        for wrong, right in replacements.items():
            text = text.replace(wrong, right)
            
        return text
    
    def split_into_sentences(self, text):
        """Split text into sentences using spaCy, filtering out trivial ones."""
        if not text:
            return []
            
        # Fix encoding issues first
        text = self._fix_encoding(text)
            
        # Try to detect language
        try:
            lang = detect(text[:100])  # Use first 100 chars for detection
        except:
            lang = 'fr'  # Default to French
            
        # Process with spaCy for better sentence segmentation
        if nlp:
            try:
                doc = nlp(text)
                # Filter out trivial sentences
                sentences = [sent.text.strip() for sent in doc.sents 
                            if sent.text.strip() and len(sent.text.strip()) >= self.min_sentence_length]
                
                if self.debug:
                    print(f"[DEBUG] Extracted {len(sentences)} meaningful sentences (min length: {self.min_sentence_length})")
                
                return sentences
            except Exception as e:
                if self.debug:
                    print(f"[DEBUG] Error splitting sentences with spaCy: {e}")
        
        # Fallback: regex-based sentence splitting
        raw_sentences = re.split(r'(?<=[.!?])\s+', text)
        # Filter out trivial sentences
        sentences = [s.strip() for s in raw_sentences if s.strip() and len(s.strip()) >= self.min_sentence_length]
        
        if self.debug:
            print(f"[DEBUG] Extracted {len(sentences)} meaningful sentences using fallback method")
            
        return sentences
    
    def chunk_document(self, text, chunk_size=200, overlap=50):
        """
        Chunk document into overlapping chunks.
        This is a simple chunking method that doesn't respect sentence boundaries.
        """
        if not text:
            return []
            
        # Fix encoding issues
        text = self._fix_encoding(text)
        
        # Clean text
        text = re.sub(r'\s+', ' ', text).strip()
        
        if self.debug:
            print(f"\n[DEBUG] CHUNKING DOCUMENT (size={chunk_size}, overlap={overlap})")
            print(f"[DEBUG] Original text length: {len(text)} characters")
        
        # Create chunks with overlap
        chunks = []
        for i in range(0, len(text), chunk_size - overlap):
            chunk = text[i:i + chunk_size]
            if len(chunk) >= chunk_size / 2:  # Only add if chunk is substantial
                chunks.append(chunk)
        
        # Filter out chunks that are too small
        chunks = [chunk for chunk in chunks if len(chunk) >= self.min_chunk_length]
        
        if self.debug:
            print(f"[DEBUG] Created {len(chunks)} chunks")
            for i, chunk in enumerate(chunks[:3]):  # Print first 3 chunks
                print(f"[DEBUG] Chunk {i}: {chunk[:100]}..." if len(chunk) > 100 else f"[DEBUG] Chunk {i}: {chunk}")
            if len(chunks) > 3:
                print(f"[DEBUG] ... and {len(chunks) - 3} more chunks")
                
        return chunks
    
    def chunk_document_semantic(self, text, min_chunk_size=80, max_chunk_size=500):
        """
        Create meaningful chunks from document text using spaCy.
        Respects sentence boundaries for better semantic comparison.
        Filters out trivial chunks.
        """
        if not text:
            return []
            
        # Clean text and fix encoding
        text = re.sub(r'\s+', ' ', text).strip()
        text = self._fix_encoding(text)
        
        if self.debug:
            print(f"\n[DEBUG] SEMANTIC CHUNKING (min={min_chunk_size}, max={max_chunk_size})")
            print(f"[DEBUG] Original text length: {len(text)} characters")
        
        # Process with spaCy for better sentence segmentation
        sentences = self.split_into_sentences(text)
        
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            # Skip very short sentences (likely not meaningful)
            if len(sentence.strip()) < self.min_sentence_length:
                if self.debug and sentence.strip():
                    print(f"[DEBUG] Skipping short sentence: {sentence}")
                continue
                
            # If adding this sentence would exceed max size, save current chunk and start new one
            if len(current_chunk) + len(sentence) <= max_chunk_size:
                current_chunk += " " + sentence if current_chunk else sentence
            else:
                if len(current_chunk) >= min_chunk_size:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence
        
        # Add the last chunk if it's big enough
        if current_chunk and len(current_chunk) >= min_chunk_size:
            chunks.append(current_chunk.strip())
        
        # Final filter to ensure all chunks are meaningful
        chunks = [chunk for chunk in chunks if len(chunk) >= self.min_chunk_length]
        
        if self.debug:
            print(f"[DEBUG] Created {len(chunks)} semantic chunks")
            if chunks:
                for i, chunk in enumerate(chunks[:2]):
                    print(f"[DEBUG] Chunk {i}: {chunk[:100]}..." if len(chunk) > 100 else f"[DEBUG] Chunk {i}: {chunk}")
                if len(chunks) > 2:
                    print(f"[DEBUG] ... and {len(chunks) - 2} more chunks")
        
        return chunks
    
    def prepare_text(self, text, chunk_size=200, overlap=50):
        """
        Prepares text for similarity comparison by:
        1. Preprocessing (cleaning)
        2. Chunking
        3. Additional cleaning of chunks
        """
        # Fix encoding issues
        text = self._fix_encoding(text)
        
        # Preprocess the full text
        cleaned_text = self.preprocess_text(text)
        
        # Create chunks
        chunks = self.chunk_document(cleaned_text, chunk_size, overlap)
        
        # Additional cleaning of chunks
        cleaned_chunks = [self.preprocess_text(chunk) for chunk in chunks]
        
        # Filter out empty chunks
        cleaned_chunks = [chunk for chunk in cleaned_chunks if chunk.strip()]
        
        return cleaned_chunks
    
    def prepare_text_semantic(self, text):
        """
        Prepares text for semantic similarity comparison:
        1. Creates meaningful chunks respecting sentence boundaries
        2. Light preprocessing to maintain semantic meaning
        """
        # Fix encoding issues
        text = self._fix_encoding(text)
        
        # Create semantic chunks
        chunks = self.chunk_document_semantic(text)
        
        # Light cleaning that maintains semantic meaning
        cleaned_chunks = [chunk.strip() for chunk in chunks if chunk.strip()]
        
        return cleaned_chunks


def extract_text_content(file_obj, file_type, debug=False):
    """
    Extract text content from various file types with improved encoding handling.
    
    Args:
        file_obj: File-like object
        file_type: Type of file (pdf, txt, docx, etc.)
        debug: Whether to print debug information
    
    Returns:
        str: Extracted text content
    """
    if debug:
        print(f"\n[DEBUG] EXTRACTING TEXT FROM: {file_type}")
    
    try:
        if file_type == 'txt':
            # For text files, use utf-8 encoding with error handling
            file_obj.seek(0)
            return file_obj.read().decode('utf-8', errors='replace')
        
        elif file_type == 'pdf':
            # Handle different file types
            if file_type.lower().endswith('.pdf'):
                if pdf_support:
                    if debug:
                        print("[DEBUG] Using PyPDF2 for PDF extraction")
                    reader = PyPDF2.PdfReader(file_obj)
                    text = ""
                    for i, page in enumerate(reader.pages):
                        page_text = page.extract_text()
                        text += page_text + "\n"
                        if debug and i < 1:  # Print first page sample
                            print(f"[DEBUG] Page {i+1} sample: {page_text[:100]}..." if page_text and len(page_text) > 100 else f"[DEBUG] Page {i+1} sample: {page_text}")
                    
                    if debug:
                        print(f"[DEBUG] Extracted {len(text)} characters from PDF")
                    return text
                else:
                    print("PDF support not available - PyPDF2 not installed")
                    return "PDF TEXT EXTRACTION ERROR: PyPDF2 not installed"
            
        elif file_type == 'docx':
            # Use python-docx with better encoding handling
            import docx
            import io
            
            # Write the file_obj to a bytes IO object
            file_bytes = io.BytesIO()
            file_obj.seek(0)
            file_bytes.write(file_obj.read())
            file_bytes.seek(0)
            
            try:
                doc = docx.Document(file_bytes)
                # Extract text with proper encoding
                text = "\n".join([para.text for para in doc.paragraphs])
                
                # If text is empty, try extracting from runs to handle complex formatting
                if not text.strip():
                    text = "\n".join([
                        "\n".join([run.text for run in para.runs])
                        for para in doc.paragraphs
                    ])
                
                return text
            except Exception as e:
                if debug:
                    print(f"[DEBUG] Error extracting with python-docx: {str(e)}")
                
                # Fallback to using the docx2txt library
                try:
                    import docx2txt
                    file_obj.seek(0)
                    return docx2txt.process(file_obj)
                except Exception as e2:
                    if debug:
                        print(f"[DEBUG] Error with docx2txt fallback: {str(e2)}")
                    
                    # Ultimate fallback to extract what we can
                    return f"[Document text extraction partially failed: {str(e)}]"
        
        # Add other file type handlers as needed
        # ...existing code for other formats...
        
        else:
            if debug:
                print(f"[DEBUG] Unsupported file type: {file_type}")
            return f"[Unsupported file type: {file_type}]"
            
    except UnicodeDecodeError as ude:
        if debug:
            print(f"[DEBUG] ERROR extracting text: {str(ude)}")
            
        # Return a placeholder but don't completely fail
        # Try with latin-1 encoding as a fallback
        try:
            file_obj.seek(0)
            return file_obj.read().decode('latin-1', errors='replace')
        except:
            return f"[Document contains special characters that couldn't be decoded]"
            
    except Exception as e:
        if debug:
            print(f"[DEBUG] ERROR extracting text: {str(e)}")
        return f"[Document text extraction error: {type(e).__name__}]"
