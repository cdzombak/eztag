# eztag - GitHub Tag Manager

A modern, clean web application that provides an easy interface for managing GitHub tags. Built with vanilla HTML, CSS, and JavaScript with GitHub-styled UI components.

## Features

- **GitHub OAuth Integration**: Secure sign-in with GitHub
- **Repository Management**: Browse and filter your non-archived repositories
- **Branch Filtering**: View branches with recent activity (last 30 days)
- **Tag Management**: View existing tags and create new ones
- **Sorting & Filtering**: Sort repositories and branches by name or last updated
- **GitHub Integration**: Direct links to open repositories in GitHub

## Setup Instructions

### 1. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: `eztag` (or your preferred name)
   - **Homepage URL**: Your Tailscale served HTTPS URL (e.g., `https://your-tailscale-name.ts.net`)
   - **Authorization callback URL**: Same as Homepage URL
4. Click "Register application"
5. Note your **Client ID** and **Client Secret**

### 2. Configure the Application

1. Open `app.js` in your editor
2. Replace `YOUR_GITHUB_OAUTH_CLIENT_ID` with your actual GitHub OAuth Client ID:
   ```javascript
   this.clientId = 'your_actual_client_id_here';
   ```

**Important Security Note**: For production use, you should implement a backend service to handle the OAuth token exchange. The current implementation includes client secret handling which should never be done client-side. For demonstration purposes, you can use GitHub's device flow or implement a simple backend proxy.

### 3. Serve with Tailscale

Since the application will be served via HTTPS using Tailscale serve, make sure to:

1. Ensure your Tailscale is configured and running
2. Use `tailscale serve` to serve the application directory over HTTPS
3. Update your GitHub OAuth App's callback URL to match your Tailscale HTTPS URL

Example Tailscale serve command:
```bash
tailscale serve --https=443 --set-path=/ /path/to/eztag
```

### 4. File Structure

```
eztag/
├── index.html          # Main HTML structure
├── styles.css          # GitHub-styled CSS
├── app.js             # Main application logic
└── README.md          # This file
```

## Usage

1. **Sign In**: Click "Sign in with GitHub" to authenticate
2. **Browse Repositories**: View and filter your repositories by name or last updated date
3. **Select Repository**: Click on a repository to view its branches and tags
4. **View Branches**: See branches with activity in the last 30 days
5. **Create Tags**: Click "Create Tag" next to any branch to create a new tag
6. **Manage Tags**: View existing tags sorted by name or creation date
7. **GitHub Integration**: Use "Open in GitHub" to view the repository on GitHub

## Technical Details

### GitHub API Scopes Required
- `repo`: Full control of private repositories (for tag creation)
- `public_repo`: Access to public repositories
- `user`: Access to user profile information

### API Endpoints Used
- `GET /user` - Get current user information
- `GET /user/repos` - List user repositories
- `GET /repos/{owner}/{repo}/branches` - List repository branches
- `GET /repos/{owner}/{repo}/tags` - List repository tags
- `GET /repos/{owner}/{repo}/commits/{sha}` - Get commit information
- `POST /repos/{owner}/{repo}/git/tags` - Create a new tag object
- `POST /repos/{owner}/{repo}/git/refs` - Create a new reference (tag)

### Security Considerations

1. **Token Storage**: Access tokens are stored in localStorage. For production, consider more secure storage methods.
2. **HTTPS Required**: OAuth requires HTTPS, which is provided by Tailscale serve.
3. **Client Secret**: Should be handled server-side, not in client-side JavaScript.
4. **CORS**: The GitHub API supports CORS for browser requests when properly authenticated.

### Browser Compatibility

The application uses modern JavaScript features and should work in:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Development

The application is built with vanilla JavaScript to minimize dependencies and complexity. All styling follows GitHub's design system for familiarity.

### Key Components

1. **Authentication Flow**: Implements OAuth 2.0 Authorization Code flow
2. **API Client**: Centralized GitHub API request handling with error management
3. **State Management**: Simple in-memory state for current user, repositories, and selected repository data
4. **UI Components**: Modular rendering functions for different screen states

## Limitations

1. **Client-Side OAuth**: For security, token exchange should be implemented server-side
2. **Rate Limiting**: No built-in GitHub API rate limit handling
3. **Error Handling**: Basic error handling with simple alert dialogs
4. **Offline Support**: No offline functionality or caching

## License

This project is provided as-is for demonstration purposes. Feel free to modify and use as needed.