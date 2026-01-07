import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { publicRoute } from '../routers/public.route.js';
import { apiRoute } from '../routers/api.route.js';
import { errorMiddleware } from '../middlewares/error.middleware.js';

export const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(publicRoute);
app.use(apiRoute);

app.use(errorMiddleware);
