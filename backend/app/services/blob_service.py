import os
import json
import logging
from azure.storage.blob import BlobServiceClient

# Azure Blob Storage Configuration
ACCOUNT_NAME = "aawaidata"
CONTAINER_NAME = "eom-dashboard"
BLOB_NAME = "parsed_dashboard_data.json"

# In production, recommend using os.environ.get("AZURE_SAS_TOKEN")
SAS_TOKEN = os.environ.get("AZURE_SAS_TOKEN", "sv=2026-02-06&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2050-06-22T19:23:04Z&st=2026-06-22T11:08:04Z&spr=https&sig=o45Xwg3krIBEO2eMoJXBZqZhcUkzrtQ5lenyvfFYii0%3D")
ACCOUNT_URL = f"https://{ACCOUNT_NAME}.blob.core.windows.net"

logger = logging.getLogger(__name__)

def get_blob_client(blob_name: str = BLOB_NAME):
    try:
        service_client = BlobServiceClient(account_url=ACCOUNT_URL, credential=SAS_TOKEN, connection_timeout=5, read_timeout=10)
        container_client = service_client.get_container_client(CONTAINER_NAME)
        blob_client = container_client.get_blob_client(blob_name)
        return blob_client
    except Exception as e:
        logger.error(f"Failed to create Blob Client: {e}")
        return None

def upload_parsed_data(parsed_data: dict) -> bool:
    """Upload the parsed JSON dictionary to Azure Blob Storage."""
    blob_client = get_blob_client()
    if not blob_client:
        return False
        
    try:
        json_data = json.dumps(parsed_data)
        blob_client.upload_blob(json_data, overwrite=True)
        logger.info(f"Successfully uploaded {BLOB_NAME} to Blob Storage.")
        return True
    except Exception as e:
        logger.error(f"Error uploading to Blob Storage: {e}")
        return False

def download_parsed_data() -> dict | None:
    """Download and parse the JSON dictionary from Azure Blob Storage."""
    blob_client = get_blob_client()
    if not blob_client:
        return None
        
    try:
        if not blob_client.exists():
            logger.info(f"Blob {BLOB_NAME} does not exist yet.")
            return None
            
        download_stream = blob_client.download_blob()
        json_data = download_stream.readall()
        parsed_data = json.loads(json_data)
        logger.info(f"Successfully downloaded {BLOB_NAME} from Blob Storage.")
        return parsed_data
    except Exception as e:
        logger.error(f"Error downloading from Blob Storage: {e}")
        return None

def delete_parsed_data() -> bool:
    """Delete the parsed JSON dictionary from Azure Blob Storage."""
    blob_client = get_blob_client()
    if not blob_client:
        return False
        
    try:
        if blob_client.exists():
            blob_client.delete_blob()
            logger.info(f"Successfully deleted {BLOB_NAME} from Blob Storage.")
        return True
    except Exception as e:
        logger.error(f"Error deleting from Blob Storage: {e}")
        return False


# ── Negative Movement Blob Persistence ─────────────────────────────────────────

NEG_MOVEMENT_BLOB = "neg_movement_data.json"
NEG_MOVEMENT_COMMENTS_BLOB = "neg_movement_comments.json"


def _get_neg_blob_client(blob_name: str):
    try:
        service_client = BlobServiceClient(account_url=ACCOUNT_URL, credential=SAS_TOKEN)
        container_client = service_client.get_container_client(CONTAINER_NAME)
        return container_client.get_blob_client(blob_name)
    except Exception as e:
        logger.error(f"Failed to create Neg Movement Blob Client: {e}")
        return None


def upload_neg_movement_data(data: dict) -> bool:
    """Upload the parsed negative movement data to Azure Blob Storage."""
    blob_client = _get_neg_blob_client(NEG_MOVEMENT_BLOB)
    if not blob_client:
        return False
    try:
        json_data = json.dumps(data)
        blob_client.upload_blob(json_data, overwrite=True)
        logger.info(f"Successfully uploaded {NEG_MOVEMENT_BLOB}.")
        return True
    except Exception as e:
        logger.error(f"Error uploading neg movement data: {e}")
        return False


def download_neg_movement_data() -> dict | None:
    """Download the parsed negative movement data from Azure Blob Storage."""
    blob_client = _get_neg_blob_client(NEG_MOVEMENT_BLOB)
    if not blob_client:
        return None
    try:
        if not blob_client.exists():
            return None
        download_stream = blob_client.download_blob()
        return json.loads(download_stream.readall())
    except Exception as e:
        logger.error(f"Error downloading neg movement data: {e}")
        return None


def upload_neg_movement_comments(comments: dict) -> bool:
    """Upload the negative movement comments to Azure Blob Storage (separate blob)."""
    blob_client = _get_neg_blob_client(NEG_MOVEMENT_COMMENTS_BLOB)
    if not blob_client:
        return False
    try:
        json_data = json.dumps(comments)
        blob_client.upload_blob(json_data, overwrite=True)
        logger.info(f"Successfully uploaded {NEG_MOVEMENT_COMMENTS_BLOB}.")
        return True
    except Exception as e:
        logger.error(f"Error uploading neg movement comments: {e}")
        return False


def download_neg_movement_comments() -> dict | None:
    """Download the negative movement comments from Azure Blob Storage."""
    blob_client = _get_neg_blob_client(NEG_MOVEMENT_COMMENTS_BLOB)
    if not blob_client:
        return None
    try:
        if not blob_client.exists():
            return None
        download_stream = blob_client.download_blob()
        return json.loads(download_stream.readall())
    except Exception as e:
        logger.error(f"Error downloading neg movement comments: {e}")
        return None


def delete_neg_movement_data() -> bool:
    """Delete both negative movement blobs."""
    success = True
    for blob_name in (NEG_MOVEMENT_BLOB, NEG_MOVEMENT_COMMENTS_BLOB):
        blob_client = _get_neg_blob_client(blob_name)
        if blob_client:
            try:
                if blob_client.exists():
                    blob_client.delete_blob()
                    logger.info(f"Deleted {blob_name}.")
            except Exception as e:
                logger.error(f"Error deleting {blob_name}: {e}")
                success = False
    return success

