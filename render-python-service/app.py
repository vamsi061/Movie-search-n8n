#!/usr/bin/env python3
"""
Render Python Service for Movie Download
Executes the simple_video_extractor.py script via API
"""

from flask import Flask, request, jsonify, Response
import subprocess
import json
import os
import sys
import threading
import time
from queue import Queue
import logging

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global queue for streaming responses
response_queue = Queue()

def stream_output(process, queue):
    """Stream process output to queue"""
    try:
        for line in iter(process.stdout.readline, b''):
            if line:
                decoded_line = line.decode('utf-8').strip()
                queue.put({
                    'status': 'progress',
                    'message': decoded_line,
                    'timestamp': time.time()
                })
        
        # Wait for process to complete
        process.wait()
        
        if process.returncode == 0:
            queue.put({
                'status': 'completed',
                'message': 'Download completed successfully',
                'timestamp': time.time()
            })
        else:
            queue.put({
                'status': 'error',
                'message': f'Process failed with return code: {process.returncode}',
                'timestamp': time.time()
            })
            
    except Exception as e:
        queue.put({
            'status': 'error',
            'message': f'Stream error: {str(e)}',
            'timestamp': time.time()
        })
    finally:
        queue.put(None)  # Signal end of stream

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'python-video-extractor',
        'timestamp': time.time()
    })

@app.route('/download', methods=['POST'])
def download_movie():
    """Download movie using Python script"""
    try:
        data = request.get_json()
        
        if not data or 'url' not in data:
            return jsonify({'error': 'URL is required'}), 400
        
        movie_url = data['url']
        title = data.get('title', 'Unknown Movie')
        download = data.get('download', True)
        output_path = data.get('output_path', './downloads/')
        
        logger.info(f"Download request: {movie_url} - {title}")
        
        # Ensure output directory exists
        os.makedirs(output_path, exist_ok=True)
        
        # Prepare command to execute Python script
        script_path = os.path.join(os.path.dirname(__file__), 'simple_video_extractor.py')
        
        # Build command arguments
        cmd = [
            sys.executable,
            script_path,
            movie_url
        ]
        
        if download:
            cmd.extend(['--download', '--output', output_path])
        
        logger.info(f"Executing command: {' '.join(cmd)}")
        
        def generate_response():
            """Generator for streaming response"""
            try:
                # Start the process
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    universal_newlines=False,
                    bufsize=1
                )
                
                # Start output streaming thread
                queue = Queue()
                thread = threading.Thread(target=stream_output, args=(process, queue))
                thread.daemon = True
                thread.start()
                
                # Send initial status
                yield json.dumps({
                    'status': 'started',
                    'message': f'Starting download for: {title}',
                    'url': movie_url,
                    'timestamp': time.time()
                }) + '\n'
                
                # Stream output
                while True:
                    try:
                        item = queue.get(timeout=30)  # 30 second timeout
                        if item is None:  # End of stream signal
                            break
                        yield json.dumps(item) + '\n'
                    except:
                        # Timeout or other error
                        yield json.dumps({
                            'status': 'error',
                            'message': 'Process timeout or error',
                            'timestamp': time.time()
                        }) + '\n'
                        break
                
                # Cleanup
                if process.poll() is None:
                    process.terminate()
                    process.wait()
                    
            except Exception as e:
                logger.error(f"Download error: {str(e)}")
                yield json.dumps({
                    'status': 'error',
                    'message': f'Download failed: {str(e)}',
                    'timestamp': time.time()
                }) + '\n'
        
        return Response(
            generate_response(),
            mimetype='text/plain',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Transfer-Encoding': 'chunked'
            }
        )
        
    except Exception as e:
        logger.error(f"API error: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)