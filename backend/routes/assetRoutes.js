const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const {
  createProduct,
  getProducts,
  registerAsset,
  getAssets,
  updateAssetStatus,
  deleteAsset,
} = require('../controllers/assetController');
const { requireAuth, requireRole } = require('../middleware/auth');

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

router.use(requireAuth);

router.post(
  '/products',
  requireRole(['ADMIN']),
  [body('name').trim().notEmpty(), body('category').trim().notEmpty()],
  validateRequest,
  createProduct
);

router.get('/products', getProducts);

router.post(
  '/assets',
  requireRole(['ADMIN']),
  [
    body('name').trim().notEmpty().isLength({ max: 200 }),
    body('category').trim().notEmpty().isLength({ max: 100 }),
    body('description').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
    body('serialNumber').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('location').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
    body('status').optional().isIn(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'MISSING']),
  ],
  validateRequest,
  registerAsset
);

router.get('/assets', getAssets);

router.patch(
  '/assets/:id',
  requireRole(['ADMIN']),
  [body('status').isIn(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'MISSING'])],
  validateRequest,
  updateAssetStatus
);

router.delete('/assets/:id', requireRole(['ADMIN']), deleteAsset);

module.exports = router;
