# EmpathEra Social - Replit Setup

## Project Overview
EmpathEra Social is a Firebase-based social media web application that allows users to:
- Sign up and sign in with email/password, Google, or Facebook
- Post messages and images to a social feed
- React to posts with emojis (like, heart, sad)
- Comment on posts
- View user profiles and messages

## Architecture
- **Frontend**: Pure HTML/CSS/JavaScript using ES modules
- **Backend**: Firebase services (Authentication, Firestore, Storage)
- **Hosting**: Static files served via Python HTTP server
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth with multiple providers

## Recent Changes (September 13, 2025)
- Set up Python HTTP server with CORS headers and no-cache policy
- Configured server to use environment PORT variable for deployment flexibility
- Used ThreadingTCPServer for better concurrent request handling
- Configured Replit workflow to serve on port 5000 with webview output
- Set up deployment configuration for autoscale deployment

## Project Structure
- `index.html` - Main login/signup page
- `feed.html` - Social media feed interface
- `feed.js` - Feed functionality (posting, reactions, comments)
- `firebase-config.js` - Firebase configuration and exports
- `server.py` - Static file server with CORS and caching headers
- `public/` - Additional public files (unused in current setup)

## User Preferences
- None specified yet

## Technical Configuration
- Server binds to 0.0.0.0:5000 for Replit compatibility
- CORS enabled for all origins (development setup)
- Cache-control headers set to prevent stale content
- Deployment configured for autoscale mode