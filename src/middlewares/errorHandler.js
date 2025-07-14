export default function errorHandler(err, req, res, next) {
    console.log('全局异常:', err);
    res.status(500).json({ code: 500, msg: 'service error'});
}
