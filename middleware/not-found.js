const notFound = (res, req, next) => {
  const error = new Error("Not found");
  error.status = 404;
  return next(error);
};

export default notFound;
