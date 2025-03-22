import { Router } from 'express';
import { getCache } from './services/cache.js';
import { createObjectCsvWriter } from 'csv-writer';
import { calculateDashboardStats } from './services/statistics.js';
import { GitHubAPI } from './utils/github.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function setupRoutes(app) {
  const router = Router();

  // Existing routes...
  
  // New GitHub integration routes
  router.post('/api/github/sync', async (req, res) => {
    try {
      const { token, repo, description = '' } = req.body;
      
      if (!token || !repo) {
        return res.status(400).json({ 
          error: 'Missing required parameters',
          message: 'GitHub token and repository name are required'
        });
      }

      const github = new GitHubAPI(token);
      
      // Create repository if it doesn't exist
      try {
        await github.createRepo(repo, description);
      } catch (error) {
        // Ignore error if repo already exists
        if (!error.response?.data?.errors?.[0]?.message?.includes('already exists')) {
          throw error;
        }
      }

      // Get list of files to sync
      const filesToSync = [
        { path: 'src/index.js', content: fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8') },
        { path: 'src/routes.js', content: fs.readFileSync(path.join(__dirname, 'routes.js'), 'utf8') },
        { path: 'package.json', content: fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8') },
        { path: 'README.md', content: fs.readFileSync(path.join(__dirname, '../README.md'), 'utf8') }
      ];

      // Create a new branch for the sync
      const branchName = `sync-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      await github.createBranch(repo, branchName);

      // Sync each file
      for (const file of filesToSync) {
        const existingFile = await github.getFile(repo, file.path);
        await github.createOrUpdateFile(
          repo,
          file.path,
          file.content,
          `Update ${file.path}`,
          branchName,
          existingFile?.sha
        );
      }

      // Create pull request
      const pr = await github.createPullRequest(
        repo,
        `Sync changes from API ${new Date().toISOString()}`,
        branchName
      );

      res.json({
        message: 'Successfully synced with GitHub',
        pull_request_url: pr.html_url
      });
    } catch (error) {
      console.error('GitHub sync error:', error);
      res.status(500).json({
        error: 'GitHub Sync Failed',
        message: error.message
      });
    }
  });

  app.use(router);
}