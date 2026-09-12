from typing import List
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

class DocumentChunker:
    def __init__(
        self,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        separators: List[str] = None
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n## ", "\n### ", "\n\n", "\n", ". ", " ", ""]
        
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=self.separators,
            keep_separator=True
        )

    def chunk_documents(self, documents: List[Document]) -> List[Document]:
        chunked_docs: List[Document] = []

        for doc_idx, doc in enumerate(documents):
            raw_chunks = self.splitter.split_text(doc.page_content)
            total_chunks = len(raw_chunks)
            
            for chunk_idx, chunk_text in enumerate(raw_chunks):
                chunk_metadata = dict(doc.metadata)
                chunk_metadata.update({
                    "chunk_index": chunk_idx,
                    "total_chunks": total_chunks,
                    "doc_index": doc_idx,
                    "char_count": len(chunk_text),
                })
                
                chunked_docs.append(Document(
                    page_content=chunk_text.strip(),
                    metadata=chunk_metadata
                ))

        return chunked_docs
