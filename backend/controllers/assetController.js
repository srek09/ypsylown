const { prisma } = require('../utils/db');

async function createProduct(req, res, next) {
  try {
    const { name, category, description } = req.body;

    const product = await prisma.productCatalog.create({
      data: { name, category, description },
    });

    return res.status(201).json(product);
  } catch (err) {
    return next(err);
  }
}

async function getProducts(req, res, next) {
  try {
    const products = await prisma.productCatalog.findMany();

    return res.status(200).json(products);
  } catch (err) {
    return next(err);
  }
}

async function registerAsset(req, res, next) {
  try {
    const { name, category, description, serialNumber, location, status } = req.body;
    const data = { name, category };

    for (const [field, value] of Object.entries({ description, serialNumber, location, status })) {
      if (value !== undefined && value !== '') data[field] = value;
    }

    const asset = await prisma.assetInstance.create({
      data,
    });

    const qrUrl = `https://ypsylon.hu/scan/${asset.uuid}`;

    return res.status(201).json({ asset, qrUrl });
  } catch (err) {
    return next(err);
  }
}

async function getAssets(req, res, next) {
  try {
    const assets = await prisma.assetInstance.findMany();

    return res.status(200).json(assets);
  } catch (err) {
    return next(err);
  }
}

const VALID_STATUSES = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'MISSING'];

async function updateAssetStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const asset = await prisma.assetInstance.update({
      where: { id: Number(id) },
      data: { status },
    });

    return res.status(200).json(asset);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Asset not found' });
    }
    return next(err);
  }
}

async function deleteAsset(req, res, next) {
  try {
    const { id } = req.params;

    await prisma.assetInstance.delete({ where: { id: Number(id) } });

    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Asset not found' });
    }
    if (err.code === 'P2003') {
      return res
        .status(409)
        .json({ error: 'Cannot delete an asset that has existing audit scan history' });
    }
    return next(err);
  }
}

module.exports = {
  createProduct,
  getProducts,
  registerAsset,
  getAssets,
  updateAssetStatus,
  deleteAsset,
};
