import { PositionRepository } from '@fedjobs/database';
import { Position } from '@fedjobs/types';

const positionRepo = new PositionRepository();

export const getPositionByUuid = async (uuid: string) => {
  return positionRepo.getByUuid(uuid);
};

export const getPositionsByUserId = async (userId: string) => {
  return positionRepo.getByUserId(userId);
};

export const updatePosition = async (uuid: string, data: Partial<Position>) => {
  return positionRepo.updateByUuid(uuid, data);
};

export const createPosition = async (data: any) => {
  return positionRepo.insert(data);
};

export const deletePosition = async (uuid: string) => {
  return positionRepo.deleteByUuid(uuid);
};
