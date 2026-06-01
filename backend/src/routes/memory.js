const { Router } = require('express');
const { getMemories, deleteMemory, clearAllMemories } = require('../controllers/memoryController');

const router = Router();

router.get('/', getMemories);
router.delete('/all', clearAllMemories);
router.delete('/:id', deleteMemory);

module.exports = router;
