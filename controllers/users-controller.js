const User = require('../models/users');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_KEY } = require('../config');

/**
 * @description Handles user registeration
 *
 * @api {POST} /users/register
 * @apiSuccess 200 {auth: true, token: token} jsonwebtoken.
 * @apiError 409 {request error} Email already exists.
 * @apiError 500 {server error} Registeration failed.
 *
 * @param {string} appReq.body.name - name provided by user
 * @param {string} appReq.body.email - email provided by user
 * @param {string} appReq.body.password - user provided password
 */
exports.registerUser = (appReq, appRes) => {
  // check whether user already exists with given email
  User.count({ email: appReq.body.email }, (err, result) => {
    if (err) {
      return appRes.status(500)
        .send('There was a problem registering the user.');
    }
    if (result > 0) return appRes.status(409).send('Email already in use.');
  });

  /**
   * TODO
   * 1. validate to ensure null values are passed for name,
   *   email, or password.
   * 2. verify email is valid i.e. '....'@'...'.'...'
   * 3. validate for secure passwords and no easy to guess passwords
   */

  // encrypt password
  const HASHED_PASSWORD = bcrypt.hashSync(appReq.body.password, 8);

  User.create(
    {
      name: appReq.body.name,
      email: appReq.body.email,
      password: HASHED_PASSWORD,
    },
    (err, user) => {
      if (err) {
        return appRes.status(500)
          .send('There was a problem registering the user.');
      }

      // create token
      const token = jwt.sign({ id: user._id }, JWT_KEY, {
        expiresIn: 86400, // expires in 24 hours
      });

      appRes.status(200).send({ auth: true, token });
    },
  );
};

/**
 * @description Get users information by utilizing verifyToken to
 *  authenticate user informtion.
 *
 * @api {GET} /users/user
 * @apiSuccess 200 {_id: db._id, name: user_name, email: user_email} User info.
 * @apiError 400 {request error} User not found.
 * @apiError 500 {server error} Problem finding user.
 */
exports.getUser = (appReq, appRes) => {
  User.findById(
    appReq.userId,
    { password: 0 },
    (err, user) => {
      if (err) return appRes.status(500).send('There was a problem with finding the user.');

      if (!user) return appRes.status(400).send('No user found.');

      appRes.status(200).send(user);
    },
  );
};

/**
 * @description Handles user login
 *
 * @api {POST} /users/login
 * @apiSuccess 200 {auth: true, token: token} jsonwebtoken.
 * @apiError 400 {request error} User not found.
 * @apiError 401 {auth: false, token: null} Invalid password.
 * @apiError 500 {server error} Problem finding user.
 *
 * @param {string} appReq.body.email - email provided by user
 * @param {string} appReq.body.password - user provided password
 */
exports.loginUser = (appReq, appRes) => {
  User.findOne({ email: appReq.body.email }, (err, user) => {
    if (err) return appRes.status(500).send('Error on the server.');
    if (!user) return appRes.status(404).send('No user found.');

    const passwordIsValid = bcrypt.compareSync(
      appReq.body.password,
      user.password,
    );

    if (!passwordIsValid) {
      return appRes.status(401).send({
        auth: false,
        token: null,
      });
    }

    const token = jwt.sign({ id: user._id }, JWT_KEY, {
      expiresIn: 86400,
    });

    appRes.status(200).send({
      auth: true,
      token,
    });
  });
};

/**
 * @description Handles logout request for backend testing purposes.
 *  NOTE - frontend should handle user logout by deleting cached token
 *
 * @api {GET} /users/logout
 * @apiSuccess 200 {auth: false, token: null} jsonwebtoken.
 */
exports.logoutUser = (appReq, appRes) => {
  appRes.status(200).send({
    auth: false,
    token: null,
  });
};
