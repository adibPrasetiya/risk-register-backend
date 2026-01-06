import express from 'express';
import cors from 'cors';
import { publicRoute } from '../routers/public.route.js';
import { errorMiddleware } from '../middlewares/error.middleware.js';

export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(publicRoute);

app.use(errorMiddleware);
