// File path: apps/web/app/services/positionService.ts
import { PositionRepository } from '@fedjobs/database';
import { Position } from '@fedjobs/types';
import { updatePosition as updatePositionAction } from '@/app/features/positions/actions/reviewPositionActions';

const positionRepo = new PositionRepository();

export const getPositionByUuid = async (uuid: string) => {
  return positionRepo.getByUuid(uuid);
};

export const getPositionsByUserId = async (userId: string) => {
  return positionRepo.getByUserId(userId);
};

export const updatePosition = async (uuid: string, data: Partial<Position>) => {
  // Use the existing action that properly handles nested types
  return await updatePositionAction(uuid, data);
};

export const createPosition = async (data: any) => {
  // For consistency in the future, we'd want to transform the data here as well
  // But for now, just use the original implementation
  return positionRepo.insert(data);
};

export const deletePosition = async (uuid: string) => {
  return positionRepo.deleteByUuid(uuid);
};
