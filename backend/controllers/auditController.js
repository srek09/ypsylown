const { prisma } = require('../utils/db');

async function listAudits(req, res, next) {
  try {
    const sessions = await prisma.auditSession.findMany({ orderBy: { createdAt: 'desc' } });

    return res.status(200).json(sessions);
  } catch (err) {
    return next(err);
  }
}

async function getExpectedAssets(req, res, next) {
  try {
    const { sessionId } = req.params;

    const session = await prisma.auditSession.findUnique({
      where: { id: Number(sessionId) },
      include: { scans: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Audit session not found' });
    }

    const where = session.targetLocation ? { location: session.targetLocation } : {};
    const assets = await prisma.assetInstance.findMany({ where });
    const scannedAssetIds = new Set((session.scans || []).map((scan) => scan.assetId));
    const scannedCount = assets.filter((asset) => scannedAssetIds.has(asset.id)).length;
    const percentage = assets.length ? Math.round((scannedCount / assets.length) * 100) : 0;

    return res.status(200).json({
      session: { ...session, scans: undefined },
      assets: assets.map((asset) => ({ ...asset, isScanned: scannedAssetIds.has(asset.id) })),
      scannedCount,
      totalCount: assets.length,
      percentage,
    });
  } catch (err) {
    return next(err);
  }
}

async function createAudit(req, res, next) {
  try {
    const { name, dueDate, targetLocation } = req.body;

    const session = await prisma.auditSession.create({
      data: {
        name,
        dueDate,
        targetLocation: targetLocation?.trim() || null,
        createdById: req.user.userId,
      },
    });

    return res.status(201).json(session);
  } catch (err) {
    return next(err);
  }
}

async function recordScan(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { uuid } = req.body;

    const session = await prisma.auditSession.findUnique({ where: { id: Number(sessionId) } });

    if (!session) {
      return res.status(404).json({ error: 'Audit session not found' });
    }

    if (session.status === 'COMPLETED') {
      return res.status(409).json({ error: 'Cannot scan a completed audit' });
    }

    const asset = await prisma.assetInstance.findUnique({ where: { uuid } });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (session.targetLocation && asset.location !== session.targetLocation) {
      return res.status(400).json({ error: "Asset does not belong to this audit's target location" });
    }

    try {
      const scan = await prisma.auditScan.create({
        data: { sessionId: Number(sessionId), assetId: asset.id, scannedById: req.user.userId },
      });

      return res.status(201).json(scan);
    } catch (err) {
      // Unique constraint on [sessionId, assetId] means this asset was already scanned in this session.
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'Asset already scanned in this audit session' });
      }

      throw err;
    }
  } catch (err) {
    return next(err);
  }
}

async function completeAudit(req, res, next) {
  try {
    const { sessionId } = req.params;

    const session = await prisma.auditSession.findUnique({ where: { id: Number(sessionId) } });

    if (!session) {
      return res.status(404).json({ error: 'Audit session not found' });
    }

    const expectedAssets = await prisma.assetInstance.findMany({
      where: session.targetLocation ? { location: session.targetLocation } : {},
    });

    const scans = await prisma.auditScan.findMany({ where: { sessionId: Number(sessionId) } });
    const scannedAssetIds = new Set(scans.map((scan) => scan.assetId));

    const missingAssetIds = expectedAssets
      .filter((asset) => !scannedAssetIds.has(asset.id))
      .map((asset) => asset.id);
    const finalPercentage = expectedAssets.length
      ? Math.round(((expectedAssets.length - missingAssetIds.length) / expectedAssets.length) * 100)
      : 0;

    // Interactive transaction so the unaccounted-for flags and the session's
    // COMPLETED status commit together; updateMany is skipped entirely when
    // there's nothing missing.
    const updatedSession = await prisma.$transaction(async (tx) => {
      if (missingAssetIds.length > 0) {
        await tx.assetInstance.updateMany({
          where: { id: { in: missingAssetIds } },
          data: { lastAuditUnaccounted: true },
        });
      }

      return tx.auditSession.update({
        where: { id: Number(sessionId) },
        data: { status: 'COMPLETED', completedAt: new Date(), finalPercentage },
      });
    });

    return res.status(200).json({
      session: updatedSession,
      discrepancies: missingAssetIds,
      percentage: finalPercentage,
    });
  } catch (err) {
    return next(err);
  }
}

async function reopenAudit(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await prisma.auditSession.findUnique({ where: { id: Number(sessionId) } });

    if (!session) {
      return res.status(404).json({ error: 'Audit session not found' });
    }

    const reopenedSession = await prisma.auditSession.update({
      where: { id: Number(sessionId) },
      data: { status: 'IN_PROGRESS', completedAt: null, finalPercentage: null },
    });

    return res.status(200).json(reopenedSession);
  } catch (err) {
    return next(err);
  }
}

module.exports = { listAudits, getExpectedAssets, createAudit, recordScan, completeAudit, reopenAudit };
