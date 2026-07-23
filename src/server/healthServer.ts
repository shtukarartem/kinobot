import { createServer, type Server } from 'node:http';

export function startHealthServer(port: number): Promise<Server> {
  const server = createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, {
        'content-type': 'application/json',
      });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    response.writeHead(404, {
      'content-type': 'application/json',
    });
    response.end(JSON.stringify({ error: 'not_found' }));
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      server.off('error', reject);
      console.info(`Healthcheck server is listening on port ${port}.`);
      resolve(server);
    });
  });
}
