import 'reflect-metadata';
import express from 'express';
import connectDatabase, {AppDataSource} from './config/database';

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Routes
app.get('/', (req, res) => {
  res.send('Hello, World! PostgreSQL is connected.');
});

// Example: TypeORM 사용 예시 엔드포인트
app.get('/users', async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository('User');
    const users = await userRepository.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({error: 'Failed to fetch users'});
    console.log(error);
  }
});

// Database 연결 후 서버 시작
connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
