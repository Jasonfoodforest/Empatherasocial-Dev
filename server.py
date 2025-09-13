#!/usr/bin/env python3
import http.server
import socketserver
import os

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache') 
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 5000))
    HOST = "0.0.0.0"
    
    # Change to the directory containing the HTML files
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.ThreadingTCPServer((HOST, PORT), CORSHTTPRequestHandler) as httpd:
        print(f"Server running at http://{HOST}:{PORT}/")
        httpd.serve_forever()