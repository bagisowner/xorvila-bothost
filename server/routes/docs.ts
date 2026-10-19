import { Router, Request, Response } from 'express';

export const docsRouter = Router();

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'BotCloud Bot Hosting Platform API',
    version: '1.0.0',
    description: 'Production REST API for provisioning, controlling, and monitoring Python and Node.js bot containers in isolated Docker environments.'
  },
  servers: [
    {
      url: '/api',
      description: 'Primary API Gateway'
    }
  ],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Authenticate user and generate session token',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  twoFactorCode: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Authenticated successfully' },
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Register new account',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  name: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'User created' } }
      }
    },
    '/servers': {
      get: {
        summary: 'List bot containers',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Array of bot servers' } }
      },
      post: {
        summary: 'Provision a new bot container',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'runtime', 'version'],
                properties: {
                  name: { type: 'string' },
                  runtime: { type: 'string', enum: ['python', 'node'] },
                  version: { type: 'string' },
                  cpuLimit: { type: 'integer', description: 'CPU percentage (100 = 1 core)' },
                  ramLimit: { type: 'integer', description: 'RAM limit in MB' },
                  storageLimit: { type: 'integer', description: 'Storage limit in MB' },
                  startupCommand: { type: 'string' },
                  workingDir: { type: 'string' },
                  restartPolicy: { type: 'string', enum: ['always', 'on-failure', 'unless-stopped', 'never'] }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Server container provisioned' } }
      }
    },
    '/servers/{id}': {
      get: { summary: 'Get bot server details by ID' },
      delete: { summary: 'Destroy bot container and isolated filesystem' }
    },
    '/servers/{id}/start': { post: { summary: 'Start bot container' } },
    '/servers/{id}/stop': { post: { summary: 'Stop bot container' } },
    '/servers/{id}/restart': { post: { summary: 'Restart bot container' } },
    '/servers/{id}/kill': { post: { summary: 'Forcefully send SIGKILL to container' } },
    '/servers/{id}/files': {
      get: { summary: 'List files in directory' }
    },
    '/servers/{id}/files/content': {
      get: { summary: 'Get file content' },
      put: { summary: 'Write file content' }
    },
    '/servers/{id}/sftp': {
      get: { summary: 'Get SFTP credentials and connection instruction' }
    },
    '/servers/{id}/startup': {
      get: { summary: 'Get startup configuration' },
      put: { summary: 'Update startup command and runtime variables' }
    },
    '/servers/{id}/dependencies/install': {
      post: { summary: 'Trigger pip install -r requirements.txt or npm install inside container' }
    },
    '/servers/{id}/git/deploy': {
      post: { summary: 'Clone or pull from Git repository branch and deploy' }
    }
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer'
      }
    }
  }
};

docsRouter.get('/openapi.json', (req: Request, res: Response) => {
  res.json(openApiSpec);
});
