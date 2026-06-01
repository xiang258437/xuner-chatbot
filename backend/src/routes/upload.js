const { Router } = require('express');
const { uploadImageHandler } = require('../controllers/uploadController');

const router = Router();

router.post('/image', uploadImageHandler);

module.exports = router;
