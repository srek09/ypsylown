jest.mock('../utils/db', () => ({
  prisma: {
    assetInstance: { create: jest.fn(), findMany: jest.fn() },
  },
}));

const { prisma } = require('../utils/db');
const { registerAsset, getAssets } = require('../controllers/assetController');

describe('registerAsset', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {
        name: 'Laptop',
        category: 'Informatika',
        description: 'Development device',
        serialNumber: 'SN-123',
        location: 'Warehouse A',
        status: 'AVAILABLE',
      },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('successfully creates an asset and returns the dynamically generated QR URL', async () => {
    const fakeUuid = '11111111-1111-1111-1111-111111111111';
    const fakeAsset = {
      id: 1,
      uuid: fakeUuid,
      serialNumber: 'SN-123',
      location: 'Warehouse A',
    };
    prisma.assetInstance.create.mockResolvedValue(fakeAsset);

    await registerAsset(req, res, next);

    expect(prisma.assetInstance.create).toHaveBeenCalledWith({
      data: {
        name: 'Laptop',
        category: 'Informatika',
        description: 'Development device',
        serialNumber: 'SN-123',
        location: 'Warehouse A',
        status: 'AVAILABLE',
      },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      asset: fakeAsset,
      qrUrl: `https://ypsylon.hu/scan/${fakeUuid}`,
    });
  });
});

describe('getAssets', () => {
  it('lists assets without querying the removed product relation', async () => {
    const assets = [{ id: 1, name: 'Laptop', status: 'AVAILABLE' }];
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    prisma.assetInstance.findMany.mockResolvedValue(assets);

    await getAssets(req, res, next);

    expect(prisma.assetInstance.findMany).toHaveBeenCalledWith();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(assets);
    expect(next).not.toHaveBeenCalled();
  });
});
