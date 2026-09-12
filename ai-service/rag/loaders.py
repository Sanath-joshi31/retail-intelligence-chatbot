import os
import glob
from typing import List, Dict, Any, Optional
from langchain_core.documents import Document

class DocumentLoader:
    def __init__(self, base_dir: Optional[str] = None):
        if base_dir:
            self.base_dir = os.path.abspath(base_dir)
        else:
            # Default to knowledge_base in workspace root
            current_dir = os.path.dirname(os.path.abspath(__file__))
            self.base_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "knowledge_base"))

    def load_file(self, file_path: str) -> List[Document]:
        abs_path = os.path.abspath(file_path)
        if not os.path.exists(abs_path):
            raise FileNotFoundError(f"Document file not found: {abs_path}")

        filename = os.path.basename(abs_path)
        rel_path = os.path.relpath(abs_path, self.base_dir) if self.base_dir in abs_path else filename
        parts = rel_path.replace("\\", "/").split("/")
        category = parts[0] if len(parts) > 1 else "general"
        doc_type = os.path.splitext(filename)[0]
        ext = os.path.splitext(filename)[1].lower()

        docs: List[Document] = []

        if ext in [".md", ".txt", ".markdown"]:
            with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            docs.append(Document(
                page_content=content,
                metadata={
                    "source": filename,
                    "rel_path": rel_path,
                    "page": 1,
                    "category": category,
                    "document_type": doc_type,
                    "file_type": ext[1:]
                }
            ))

        elif ext == ".json":
            import json
            with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
                data = json.load(f)
            content = json.dumps(data, indent=2)
            docs.append(Document(
                page_content=content,
                metadata={
                    "source": filename,
                    "rel_path": rel_path,
                    "page": 1,
                    "category": category,
                    "document_type": doc_type,
                    "file_type": "json"
                }
            ))

        elif ext == ".pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(abs_path)
                for page_num, page in enumerate(reader.pages, start=1):
                    text = page.extract_text() or ""
                    if text.strip():
                        docs.append(Document(
                            page_content=text,
                            metadata={
                                "source": filename,
                                "rel_path": rel_path,
                                "page": page_num,
                                "category": category,
                                "document_type": doc_type,
                                "file_type": "pdf"
                            }
                        ))
            except Exception as e:
                # Fallback text reading if pypdf unavailable
                docs.append(Document(
                    page_content=f"[PDF Document: {filename}]",
                    metadata={
                        "source": filename,
                        "rel_path": rel_path,
                        "page": 1,
                        "category": category,
                        "document_type": doc_type,
                        "file_type": "pdf",
                        "error": str(e)
                    }
                ))

        elif ext in [".docx", ".doc"]:
            try:
                import docx
                doc = docx.Document(abs_path)
                full_text = []
                for para in doc.paragraphs:
                    if para.text.strip():
                        full_text.append(para.text)
                content = "\n\n".join(full_text)
                docs.append(Document(
                    page_content=content,
                    metadata={
                        "source": filename,
                        "rel_path": rel_path,
                        "page": 1,
                        "category": category,
                        "document_type": doc_type,
                        "file_type": "docx"
                    }
                ))
            except Exception as e:
                docs.append(Document(
                    page_content=f"[DOCX Document: {filename}]",
                    metadata={
                        "source": filename,
                        "rel_path": rel_path,
                        "page": 1,
                        "category": category,
                        "document_type": doc_type,
                        "file_type": "docx",
                        "error": str(e)
                    }
                ))

        return docs

    def load_all(self, directory: Optional[str] = None) -> List[Document]:
        target_dir = os.path.abspath(directory) if directory else self.base_dir
        if not os.path.exists(target_dir):
            return []

        all_docs: List[Document] = []
        supported_extensions = ["*.md", "*.txt", "*.markdown", "*.json", "*.pdf", "*.docx"]
        
        for ext in supported_extensions:
            pattern = os.path.join(target_dir, "**", ext)
            for file_path in glob.glob(pattern, recursive=True):
                try:
                    loaded = self.load_file(file_path)
                    all_docs.extend(loaded)
                except Exception as e:
                    print(f"Warning: Failed to load {file_path}: {e}")

        return all_docs
