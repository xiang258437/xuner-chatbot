const { Router } = require('express');
const {
  sendMessage,
  getConversations,
  getConversationMessages,
  updateConversation,
  deleteConversation,
} = require('../controllers/chatController');

const router = Router();

router.post('/send', sendMessage);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationMessages);
router.patch('/conversations/:id', updateConversation);
router.delete('/conversations/:id', deleteConversation);

module.exports = router;
