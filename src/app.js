import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({
    limit: "16kb",
}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(express.static("public"));
app.use(cookieParser());

// ROUTES import
import userRouter from './routes/user.routes.js'
import commentRouter from './routes/comment.routes.js'
// ROUTES declaration
app.use("/api/v1/users", userRouter);
app.use("/ap1/v1/comments",commentRouter);


export {app};