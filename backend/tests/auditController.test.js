jest.mock('../utils/db', () => ({
  prisma: {
    auditSession: { findUnique: jest.fn(), update: jest.fn() },
    assetInstance: { findMany: jest.fn(), updateMany: jest.fn() },
    auditScan: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const { prisma } = require('../utils/db');
const { completeAudit } = require('../controllers/auditController');

describe('completeAudit', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    // $transaction must invoke the callback with the same mock object as `prisma`
    // so that assertions on prisma.assetInstance.updateMany / prisma.auditSession.update work
    prisma.$transaction.mockImplementation((callback) => callback(prisma));

    req = { params: { sessionId: '1' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('completes an audit with no discrepancies when all expected assets were scanned', async () => {
    prisma.auditSession.findUnique.mockResolvedValue({ id: 1, targetLocation: 'Warehouse A' });
    prisma.assetInstance.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    prisma.auditScan.findMany.mockResolvedValue([{ assetId: 1 }, { assetId: 2 }]);
    prisma.auditSession.update.mockResolvedValue({
      id: 1,
      status: 'COMPLETED',
      completedAt: new Date('2024-01-01'),
    });

    await completeAudit(req, res, next);

    expect(prisma.assetInstance.updateMany).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ discrepancies: [] })
    );
  });

  it('flags missing assets as discrepancies when some expected assets were not scanned', async () => {
    prisma.auditSession.findUnique.mockResolvedValue({ id: 1, targetLocation: 'Warehouse A' });
    prisma.assetInstance.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    prisma.auditScan.findMany.mockResolvedValue([{ assetId: 1 }]);
    prisma.auditSession.update.mockResolvedValue({
      id: 1,
      status: 'COMPLETED',
      completedAt: new Date('2024-01-01'),
    });

    await completeAudit(req, res, next);

    expect(prisma.assetInstance.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [2, 3] } },
      data: { lastAuditUnaccounted: true },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ discrepancies: [2, 3] })
    );
  });
});
