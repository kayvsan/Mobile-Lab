import os
import requests
import logging

logger = logging.getLogger("agent.pusher")

class ResultPusher:
    """Upload execution results back to server"""
    
    def __init__(self, api):
        self.api = api

    def upload_file(self, execution_id, file_path, file_type):
        """Upload a file (screenshot/recording) to the server"""
        if not os.path.exists(file_path):
            return False
            
        try:
            with open(file_path, 'rb') as f:
                files = {'file': f}
                data = {
                    'execution_id': execution_id,
                    'type': file_type
                }
                response = self.api.post_file("/agent/upload", files, data)
                return response.status_code == 201
        except Exception as e:
            logger.error(f"Upload failed: {e}")
            return False
