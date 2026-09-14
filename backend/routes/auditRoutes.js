const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const {
	listAudits,
	getExpectedAssets,
	createAudit,
	recordScan,
	completeAudit,
	reopenAudit,
} = require('../controllers/auditController');
const { requireAuth, requireRole } = require('../middleware/auth');

function validateRequest(req, res, next) {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	next();
}

router.use(requireAuth);

router.get('/', listAudits);
router.get('/:sessionId/assets', [param('sessionId').isInt({ min: 1 })], validateRequest, getExpectedAssets);
router.post(
	'/',
	requireRole(['ADMIN']),
	[
		body('name').trim().notEmpty().isLength({ max: 200 }),
		body('targetLocation').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
		body('dueDate').optional({ checkFalsy: true }).isISO8601(),
	],
	validateRequest,
	createAudit
);
router.post(
	'/:sessionId/scan',
	requireRole(['ADMIN', 'SCANNER']),
	[param('sessionId').isInt({ min: 1 }), body('uuid').isUUID()],
	validateRequest,
	recordScan
);
router.post('/:sessionId/complete', requireRole(['ADMIN']), [param('sessionId').isInt({ min: 1 })], validateRequest, completeAudit);
router.post('/:sessionId/reopen', requireRole(['ADMIN']), [param('sessionId').isInt({ min: 1 })], validateRequest, reopenAudit);

module.exports = router;
