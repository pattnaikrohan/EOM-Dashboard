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

def get_blob_client():
    try:
        service_client = BlobServiceClient(account_url=ACCOUNT_URL, credential=SAS_TOKEN)
        container_client = service_client.get_container_client(CONTAINER_NAME)
        blob_client = container_client.get_blob_client(BLOB_NAME)
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
