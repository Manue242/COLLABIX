"""
Recherche vectorielle (indexation sémantique) via ChromaDB.
Chaque segment de chaque vidéo est encodé en vecteur (sentence-transformers) et
stocké dans une base ChromaDB persistante. La recherche renvoie les passages les
plus proches sémantiquement, avec leur vidéo et leurs timestamps.
"""
import chromadb
from chromadb.utils import embedding_functions

# Base persistante (survit aux redémarrages) dans ./chroma_db
_DB_PATH = "chroma_db"
_COLLECTION = "segments"

# Modèle d'embedding multilingue (bonne pertinence en français).
# Téléchargé une seule fois (~420 Mo) au premier lancement, puis mis en cache.
# Pour éviter tout téléchargement, revenir à "all-MiniLM-L6-v2" (orienté anglais).
_EMBED_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"

_collection = None


def get_collection():
    global _collection
    if _collection is None:
        client = chromadb.PersistentClient(path=_DB_PATH)
        ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=_EMBED_MODEL)
        _collection = client.get_or_create_collection(
            name=_COLLECTION,
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def index_segments(video_id: str, filename: str, segments: list[dict]) -> int:
    """
    Indexe (ou met à jour) les segments d'une vidéo dans la base vectorielle.

    Returns:
        Nombre de segments indexés.
    """
    # On ignore les segments vides (ChromaDB refuse les documents vides).
    valid = [seg for seg in segments if seg.get("text", "").strip()]
    if not valid:
        return 0

    col = get_collection()
    col.upsert(
        ids=[f"{video_id}-{seg['id']}" for seg in valid],
        documents=[seg["text"] for seg in valid],
        metadatas=[{
            "videoId": video_id,
            "filename": filename,
            "segmentId": seg["id"],
            "start": seg["start"],
            "end": seg["end"],
        } for seg in valid],
    )
    return len(valid)


def search(query: str, top_k: int = 5, video_id: str | None = None) -> list[dict]:
    """
    Recherche sémantique dans le corpus (ou dans une seule vidéo si video_id fourni).

    Returns:
        [{"videoId", "filename", "segmentId", "start", "end", "text", "score"}, ...]
        trié du plus pertinent au moins pertinent.
    """
    if not query or not query.strip():
        return []

    col = get_collection()
    where = {"videoId": video_id} if video_id else None
    res = col.query(query_texts=[query], n_results=top_k, where=where)

    results = []
    ids = res.get("ids", [[]])[0]
    for i in range(len(ids)):
        meta = res["metadatas"][0][i]
        distance = res["distances"][0][i]
        results.append({
            "videoId": meta["videoId"],
            "filename": meta.get("filename"),
            "segmentId": meta["segmentId"],
            "start": meta["start"],
            "end": meta["end"],
            "text": res["documents"][0][i],
            # distance cosinus -> score de similarité (1 = identique)
            "score": round(1 - distance, 4),
        })
    return results
