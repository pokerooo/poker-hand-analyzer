import { createServer } from 'http';
import app from '../dist/index.js';

const server = createServer(app);
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
