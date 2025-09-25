class EzTagApp {
  constructor() {
    // OAuth configuration - client ID and secret are now handled server-side
    this.redirectUri = window.location.origin + window.location.pathname;
    this.clientId = null;

    this.accessToken = null;
    this.currentUser = null;
    this.currentRepo = null;
    this.repositories = [];
    this.branches = [];
    this.tags = [];

    this.initializeApp();
  }

  async initializeApp() {
    await this.loadConfig();
    this.bindEvents();
    this.setupHistoryHandling();
    this.checkAuthStatus();
  }

  async loadConfig() {
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      this.clientId = config.client_id;
    } catch (error) {
      console.error('Failed to load config:', error);
      this.showError('Failed to load application configuration');
    }
  }

  setupHistoryHandling() {
    window.addEventListener('popstate', (event) => {
      if (event.state) {
        this.handleHistoryNavigation(event.state);
      } else {
        // No state means we're back to the initial page
        if (this.accessToken) {
          this.showRepoScreen();
        } else {
          this.showAuthScreen();
        }
      }
    });
  }

  handleHistoryNavigation(state) {
    if (state.screen === 'repos') {
      this.showRepoScreen(true); // skip history push
    } else if (state.screen === 'repo-detail' && state.repo) {
      this.fetchRepositoryDetails(state.repo, true); // skip history push
    }
  }

  bindEvents() {
    // Auth events
    document.getElementById('signInBtn').addEventListener('click', () => this.signIn());
    document.getElementById('signOutBtn').addEventListener('click', () => this.signOut());

    // Repository list events
    document.getElementById('repoFilter').addEventListener('input', (e) => this.filterRepositories(e.target.value));
    document.getElementById('repoSort').addEventListener('change', (e) => this.sortRepositories(e.target.value));

    // Detail screen events
    document.getElementById('backBtn').addEventListener('click', () => this.showRepoScreen());
    document.getElementById('openGitHubBtn').addEventListener('click', () => this.openInGitHub());
    document.getElementById('branchSort').addEventListener('change', (e) => this.sortBranches(e.target.value));
    document.getElementById('tagSort').addEventListener('change', (e) => this.sortTags(e.target.value));

    // Modal events
    document.getElementById('modalOverlay').addEventListener('click', () => this.closeModal());
    document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
    document.getElementById('cancelTagBtn').addEventListener('click', () => this.closeModal());
    document.getElementById('createTagBtn').addEventListener('click', () => this.createTag());
  }

  checkAuthStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = sessionStorage.getItem('oauth_state');

    if (code && state && state === storedState) {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      sessionStorage.removeItem('oauth_state');

      // Exchange code for access token
      this.exchangeCodeForToken(code);
      return;
    }

    // Check if we have a stored access token
    const storedToken = localStorage.getItem('github_access_token');
    if (storedToken) {
      this.accessToken = storedToken;
      this.fetchCurrentUser();
    } else {
      this.showAuthScreen();
    }
  }

  async exchangeCodeForToken(code) {
    try {
      // Use our server's token exchange endpoint for security
      const response = await fetch('/api/oauth/token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
        }),
      });

      const data = await response.json();

      if (data.access_token) {
        this.accessToken = data.access_token;
        localStorage.setItem('github_access_token', this.accessToken);
        this.fetchCurrentUser();
      } else {
        throw new Error(data.error || 'Failed to get access token');
      }
    } catch (error) {
      console.error('Token exchange failed:', error);
      this.showAuthScreen();
    }
  }

  signIn() {
    if (!this.clientId) {
      this.showError('Application not properly configured');
      return;
    }

    const state = this.generateRandomString(32);
    sessionStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'repo public_repo user',
      state: state,
      allow_signup: 'true'
    });

    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  signOut() {
    this.accessToken = null;
    this.currentUser = null;
    this.currentRepo = null;
    this.repositories = [];
    this.branches = [];
    this.tags = [];

    localStorage.removeItem('github_access_token');
    this.showAuthScreen();
  }

  async fetchCurrentUser() {
    try {
      const response = await this.githubAPI('/user');
      this.currentUser = response;
      this.updateUserInfo();
      this.fetchRepositories();
    } catch (error) {
      console.error('Failed to fetch user:', error);
      this.signOut();
    }
  }

  async fetchRepositories() {
    try {
      this.showRepoScreen();
      const repos = await this.githubAPI('/user/repos?type=owner&sort=updated&per_page=100');
      this.repositories = repos.filter(repo => !repo.archived);
      this.renderRepositories();
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      this.showError('Failed to load repositories');
    }
  }

  async fetchRepositoryDetails(repo, skipHistory = false) {
    try {
      this.currentRepo = repo;
      this.showDetailScreen();

      // Push to history unless we're navigating from history
      if (!skipHistory) {
        const state = { screen: 'repo-detail', repo: repo };
        history.pushState(state, '', `#repo/${repo.full_name}`);
      }

      const [branches, tags] = await Promise.all([
        this.githubAPI(`/repos/${repo.full_name}/branches`),
        this.githubAPI(`/repos/${repo.full_name}/tags`)
      ]);

      // Find recent branches by searching back in 30-day increments
      this.branches = await this.findRecentBranches(repo.full_name, branches);

      // Enhance tags with detailed information
      this.tags = await this.enhanceTagsWithDetails(repo.full_name, tags);
      this.renderBranches();
      this.renderTags();
    } catch (error) {
      console.error('Failed to fetch repository details:', error);
      this.showError('Failed to load repository details');
    }
  }

  async findRecentBranches(repoFullName, branches) {
    let daysBack = 30;
    let recentBranches = [];
    const maxDaysBack = 365; // Don't search back more than a year

    while (recentBranches.length === 0 && daysBack <= maxDaysBack) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      // Get commit details for up to 15 branches (to avoid too many API calls)
      const branchesWithCommits = await Promise.all(
        branches.slice(0, 15).map(async (branch) => {
          try {
            const commit = await this.githubAPI(`/repos/${repoFullName}/commits/${branch.commit.sha}`);
            return {
              ...branch,
              lastCommit: commit.commit.committer.date,
              lastCommitMessage: commit.commit.message
            };
          } catch {
            return {
              ...branch,
              lastCommit: null,
              lastCommitMessage: 'Unknown'
            };
          }
        })
      );

      // Filter branches updated within the current time window
      recentBranches = branchesWithCommits.filter(branch => {
        if (!branch.lastCommit) return true; // Include branches we couldn't get commit info for
        return new Date(branch.lastCommit) >= cutoffDate;
      });

      if (recentBranches.length === 0) {
        daysBack += 30; // Search back another 30 days
        console.log(`No branches found in last ${daysBack - 30} days, searching back ${daysBack} days`);
      }
    }

    // If still no branches found, just return all branches with commit info
    if (recentBranches.length === 0) {
      console.log('No recent branches found, returning all available branches');
      return branches.slice(0, 10).map(branch => ({
        ...branch,
        lastCommit: null,
        lastCommitMessage: 'Unknown'
      }));
    }

    // Sort by last commit date (most recent first) by default
    return recentBranches.sort((a, b) => {
      if (!a.lastCommit || !b.lastCommit) return 0;
      return new Date(b.lastCommit) - new Date(a.lastCommit);
    });
  }

  async enhanceTagsWithDetails(repoFullName, tags) {
    // Get detailed information for each tag (limit to first 20 to avoid too many API calls)
    const enhancedTags = await Promise.all(
      tags.slice(0, 20).map(async (tag) => {
        try {
          let createdDate = null;
          let branches = ['main']; // Default assumption
          let message = 'No message';

          // Get the commit details first
          const commit = await this.githubAPI(`/repos/${repoFullName}/commits/${tag.commit.sha}`);
          createdDate = commit.commit.committer.date;

          // Try to get the actual tag object if it exists (for annotated tags)
          try {
            // For annotated tags, the tag object exists and has more detailed info
            const refs = await this.githubAPI(`/repos/${repoFullName}/git/refs/tags/${tag.name}`);
            if (refs.object && refs.object.type === 'tag') {
              const gitTag = await this.githubAPI(`/repos/${repoFullName}/git/tags/${refs.object.sha}`);
              if (gitTag.tagger) {
                createdDate = gitTag.tagger.date;
                message = gitTag.message || 'No message';
              }
            }
          } catch (tagError) {
            // This is likely a lightweight tag, just use commit date
            console.log(`Tag ${tag.name} appears to be a lightweight tag`);
          }

          // Simplified branch detection - assume main/master branch for now
          // This avoids complex API calls that might fail
          branches = ['main'];

          return {
            ...tag,
            createdDate,
            branches,
            message
          };
        } catch (error) {
          console.warn(`Could not fetch details for tag ${tag.name}:`, error);
          return {
            ...tag,
            createdDate: null,
            branches: ['main'],
            message: 'No message'
          };
        }
      })
    );

    // Sort by creation date (most recent first) by default
    return enhancedTags.sort((a, b) => {
      if (!a.createdDate || !b.createdDate) return 0;
      return new Date(b.createdDate) - new Date(a.createdDate);
    });
  }

  async createTag() {
    const tagName = document.getElementById('tagName').value.trim();
    const tagMessage = document.getElementById('tagMessage').value.trim();
    const selectedBranch = document.querySelector('.create-tag-btn.selected')?.dataset.branch;

    if (!tagName || !selectedBranch) {
      alert('Please enter a tag name and select a branch');
      return;
    }

    try {
      // Get the latest commit SHA for the branch
      const branchData = await this.githubAPI(`/repos/${this.currentRepo.full_name}/branches/${selectedBranch}`);
      const commitSha = branchData.commit.sha;

      // Create the tag
      const tagData = {
        tag: tagName,
        message: tagMessage || `Tag ${tagName}`,
        object: commitSha,
        type: 'commit',
        tagger: {
          name: this.currentUser.name || this.currentUser.login,
          email: this.currentUser.email || `${this.currentUser.login}@users.noreply.github.com`,
          date: new Date().toISOString()
        }
      };

      await this.githubAPI(`/repos/${this.currentRepo.full_name}/git/tags`, 'POST', tagData);

      // Create the reference
      const refData = {
        ref: `refs/tags/${tagName}`,
        sha: commitSha
      };

      await this.githubAPI(`/repos/${this.currentRepo.full_name}/git/refs`, 'POST', refData);

      this.closeModal();
      this.showSuccess(`Tag "${tagName}" created successfully!`);

      // Refresh tags list
      this.fetchRepositoryDetails(this.currentRepo);
    } catch (error) {
      console.error('Failed to create tag:', error);
      this.showError('Failed to create tag: ' + (error.message || 'Unknown error'));
    }
  }

  async githubAPI(endpoint, method = 'GET', body = null) {
    const response = await fetch(`https://api.github.com${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // UI Methods
  showAuthScreen() {
    this.hideAllScreens();
    document.getElementById('authScreen').style.display = 'block';
    document.getElementById('userInfo').style.display = 'none';
  }

  showRepoScreen(skipHistory = false) {
    this.hideAllScreens();
    document.getElementById('repoScreen').style.display = 'block';
    document.getElementById('userInfo').style.display = 'flex';

    // Push to history unless we're navigating from history
    if (!skipHistory) {
      const state = { screen: 'repos' };
      history.pushState(state, '', '#repos');
    }
  }

  showDetailScreen() {
    this.hideAllScreens();
    document.getElementById('detailScreen').style.display = 'block';
    document.getElementById('userInfo').style.display = 'flex';
    document.getElementById('currentRepoName').textContent = this.currentRepo.name;
  }

  hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.style.display = 'none';
    });
  }

  updateUserInfo() {
    document.getElementById('userAvatar').src = this.currentUser.avatar_url;
    document.getElementById('userName').textContent = this.currentUser.login;
  }

  renderRepositories() {
    const container = document.getElementById('repoList');

    if (this.repositories.length === 0) {
      container.innerHTML = '<div class="empty">No repositories found</div>';
      return;
    }

    container.innerHTML = this.repositories.map(repo => `
      <div class="repo-item" onclick="app.fetchRepositoryDetails(${JSON.stringify(repo).replace(/"/g, '&quot;')})">
        <h3>${repo.name}</h3>
        <p>${repo.description || 'No description available'}</p>
        <div class="repo-meta">
          <span>
            <svg class="octicon" viewBox="0 0 16 16" width="12" height="12">
              <path fill-rule="evenodd" d="M8.75 1.75C8.75 1.336 8.414 1 8 1s-.75.336-.75.75v.5c0 .414.336.75.75.75s.75-.336.75-.75v-.5zM8 3.5c-2.485 0-4.5 2.015-4.5 4.5s2.015 4.5 4.5 4.5 4.5-2.015 4.5-4.5S10.485 3.5 8 3.5zm0 1.5c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z"/>
            </svg>
            ${repo.language || 'Unknown'}
          </span>
          <span>Updated ${this.formatDate(repo.updated_at)}</span>
        </div>
      </div>
    `).join('');
  }

  renderBranches() {
    const container = document.getElementById('branchList');

    if (this.branches.length === 0) {
      container.innerHTML = '<div class="empty">No recent branches found</div>';
      return;
    }

    container.innerHTML = this.branches.map(branch => `
      <div class="branch-item">
        <div class="branch-info">
          <div class="branch-name">
            <a href="https://github.com/${this.currentRepo.full_name}/commits/${branch.name}" target="_blank" rel="noopener noreferrer">${branch.name}</a>
          </div>
          <div class="branch-meta">
            ${branch.lastCommit ? `Last commit ${this.formatDate(branch.lastCommit)}` : 'Recent activity'}
          </div>
        </div>
        <button class="create-tag-btn" data-branch="${branch.name}" onclick="app.showCreateTagModal('${branch.name}')">
          Create Tag
        </button>
      </div>
    `).join('');
  }

  renderTags() {
    const container = document.getElementById('tagList');

    if (this.tags.length === 0) {
      container.innerHTML = '<div class="empty">No tags found</div>';
      return;
    }

    container.innerHTML = this.tags.map(tag => `
      <div class="tag-item">
        <div class="tag-info">
          <div class="tag-name">${tag.name}</div>
          <div class="tag-meta">
            ${tag.createdDate ? `Created ${this.formatDate(tag.createdDate)}` : 'Creation date unknown'}
            <br>
            ${tag.branches && tag.branches.length > 0 ? `Branch${tag.branches.length > 1 ? 'es' : ''}: ${tag.branches.map(branch =>
              `<a href="https://github.com/${this.currentRepo.full_name}/commits/${branch}" target="_blank" rel="noopener noreferrer">${branch}</a>`
            ).join(', ')}` : 'Branch unknown'}
            <br>
            Commit <a href="https://github.com/${this.currentRepo.full_name}/commit/${tag.commit.sha}" target="_blank" rel="noopener noreferrer">${tag.commit.sha.substring(0, 7)}</a>
          </div>
        </div>
      </div>
    `).join('');
  }

  filterRepositories(query) {
    const filteredRepos = this.repositories.filter(repo =>
      repo.name.toLowerCase().includes(query.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(query.toLowerCase()))
    );

    const container = document.getElementById('repoList');
    if (filteredRepos.length === 0 && query) {
      container.innerHTML = '<div class="empty">No repositories match your search</div>';
      return;
    }

    // Temporarily update repositories for rendering
    const originalRepos = this.repositories;
    this.repositories = filteredRepos;
    this.renderRepositories();
    this.repositories = originalRepos;
  }

  sortRepositories(sortBy) {
    const sorted = [...this.repositories].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      } else if (sortBy === 'updated') {
        return new Date(b.updated_at) - new Date(a.updated_at);
      }
      return 0;
    });

    this.repositories = sorted;
    this.renderRepositories();
  }

  sortBranches(sortBy) {
    const sorted = [...this.branches].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      } else if (sortBy === 'updated') {
        if (!a.lastCommit || !b.lastCommit) return 0;
        return new Date(b.lastCommit) - new Date(a.lastCommit);
      }
      return 0;
    });

    this.branches = sorted;
    this.renderBranches();
  }

  sortTags(sortBy) {
    const sorted = [...this.tags].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      } else if (sortBy === 'created') {
        // Tags don't have creation dates directly, so we'll sort by commit date
        return b.name.localeCompare(a.name); // Fallback to name sorting
      }
      return 0;
    });

    this.tags = sorted;
    this.renderTags();
  }

  showCreateTagModal(branchName) {
    document.getElementById('createTagModal').style.display = 'flex';
    document.getElementById('selectedBranch').textContent = branchName;
    document.getElementById('tagName').value = '';
    document.getElementById('tagMessage').value = '';

    // Store branch name for later use
    document.getElementById('createTagModal').dataset.branch = branchName;
  }

  closeModal() {
    document.getElementById('createTagModal').style.display = 'none';
  }

  openInGitHub() {
    if (this.currentRepo) {
      window.open(this.currentRepo.html_url, '_blank');
    }
  }

  showError(message) {
    // Simple error display - you could enhance this with a proper notification system
    alert(`Error: ${message}`);
  }

  showSuccess(message) {
    // Simple success display - you could enhance this with a proper notification system
    alert(`Success: ${message}`);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  }

  generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Initialize the app
const app = new EzTagApp();
