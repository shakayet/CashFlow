import cors from 'cors';
import express, { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import session from 'express-session';
import passport from 'passport';
import { initializePassport } from './config/passport';
import config from './config';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import router from './routes';
import { Morgan } from './shared/morgen';
const app = express();

//morgan
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

//body parser
app.use(
  cors({
    origin: config.cors_origins.includes('*') ? '*' : config.cors_origins,
  }),
);

// Handle Private Network Access preflight (CORS-RFC1918)
// app.use((req, res, next) => {
//   if (req.headers['access-control-request-private-network']) {
//     res.setHeader('Access-Control-Allow-Private-Network', 'true');
//   }
//   next();
// });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//session configuration for OAuth
app.use(
  session({
    secret: config.oauth.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.node_env === 'production',
      httpOnly: true,
      maxAge: Number(config.oauth.sessionMaxAgeMs),
    },
  }),
);

//initialize Passport.js
initializePassport();
app.use(passport.initialize());
app.use(passport.session());

//file retrieve
app.use(express.static('uploads'));

//router
app.use('/api/v1', router);

//live response
app.get('/', (req: Request, res: Response) => {
  const date = new Date(Date.now());
  res.send(
    `<h1 style="text-align:center; color:#173616; font-family:Verdana;">Beep-beep! The server is alive and kicking.</h1>
    <p style="text-align:center; color:#173616; font-family:Verdana;">${date}</p>
    `,
  );
});

//global error handle
app.use(globalErrorHandler);

//handle not found route;
app.use((req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: 'Not found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: "API DOESN'T EXIST",
      },
    ],
  });
});

export default app;
