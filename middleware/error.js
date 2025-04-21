const errorHandler = (error, req, res, next) => {
  const statusCode = error.status;

  if (statusCode) {
    res.status(statusCode).send({ msg: error.message });
  } else {
    res.status(500).send({ msg: error.message });
  }
};

export default errorHandler;
