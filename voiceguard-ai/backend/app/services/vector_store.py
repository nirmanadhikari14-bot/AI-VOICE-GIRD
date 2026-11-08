from abc import ABC, abstractmethod
from typing import List, Any

class VectorStore(ABC):
    """
    Abstract base class for vector storage operations.
    Will be implemented via pgvector or FAISS in later phases.
    """
    
    @abstractmethod
    def store_embedding(self, profile_id: str, embedding: List[float], metadata: dict = None) -> bool:
        pass
        
    @abstractmethod
    def retrieve_embedding(self, profile_id: str) -> List[float]:
        pass
        
    @abstractmethod
    def similarity_search(self, embedding: List[float], limit: int = 5) -> List[Any]:
        pass
        
    @abstractmethod
    def delete_embedding(self, profile_id: str) -> bool:
        pass
