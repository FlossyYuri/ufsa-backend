import axios from 'axios';

const GITHUB_API = 'https://api.github.com';

export class GitHubAPI {
  constructor(token) {
    this.client = axios.create({
      baseURL: GITHUB_API,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    });
  }

  async createRepo(name, description = '', isPrivate = false) {
    try {
      const response = await this.client.post('/user/repos', {
        name,
        description,
        private: isPrivate,
        auto_init: true
      });
      return response.data;
    } catch (error) {
      console.error('Error creating repository:', error.response?.data || error.message);
      throw error;
    }
  }

  async createOrUpdateFile(repo, path, content, message, branch = 'main', sha = null) {
    try {
      const endpoint = `/repos/${repo}/contents/${path}`;
      const data = {
        message,
        content: Buffer.from(content).toString('base64'),
        branch
      };

      if (sha) {
        data.sha = sha;
      }

      const response = await this.client.put(endpoint, data);
      return response.data;
    } catch (error) {
      console.error('Error updating file:', error.response?.data || error.message);
      throw error;
    }
  }

  async getFile(repo, path, branch = 'main') {
    try {
      const response = await this.client.get(`/repos/${repo}/contents/${path}?ref=${branch}`);
      return {
        content: Buffer.from(response.data.content, 'base64').toString(),
        sha: response.data.sha
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async createBranch(repo, branchName, fromBranch = 'main') {
    try {
      // Get the SHA of the latest commit on the source branch
      const refResponse = await this.client.get(`/repos/${repo}/git/ref/heads/${fromBranch}`);
      const sha = refResponse.data.object.sha;

      // Create new branch
      await this.client.post(`/repos/${repo}/git/refs`, {
        ref: `refs/heads/${branchName}`,
        sha
      });
    } catch (error) {
      console.error('Error creating branch:', error.response?.data || error.message);
      throw error;
    }
  }

  async createPullRequest(repo, title, head, base = 'main', body = '') {
    try {
      const response = await this.client.post(`/repos/${repo}/pulls`, {
        title,
        head,
        base,
        body
      });
      return response.data;
    } catch (error) {
      console.error('Error creating pull request:', error.response?.data || error.message);
      throw error;
    }
  }
}