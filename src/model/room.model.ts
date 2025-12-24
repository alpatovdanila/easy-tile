import { makeAutoObservable } from 'mobx';
import { DEFAULT_ROOM_DIMENSIONS, type RoomDimensions } from '../types/room.types';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from '../lib/storage';

export class RoomModel {
  width: number = DEFAULT_ROOM_DIMENSIONS.width;
  height: number = DEFAULT_ROOM_DIMENSIONS.height;
  length: number = DEFAULT_ROOM_DIMENSIONS.length;

  constructor() {
    makeAutoObservable(this);
    this.loadFromStorage();
  }

  setDimensions(width: number, height: number, length: number): void {
    this.width = width;
    this.height = height;
    this.length = length;
    this.saveToStorage();
  }

  setWidth(width: number): void {
    this.width = width;
    this.saveToStorage();
  }

  setHeight(height: number): void {
    this.height = height;
    this.saveToStorage();
  }

  setLength(length: number): void {
    this.length = length;
    this.saveToStorage();
  }

  loadFromStorage(): void {
    const stored = loadFromStorage<RoomDimensions>(STORAGE_KEYS.ROOM);
    if (stored) {
      // Migration: If values are > 100, assume they're in mm and convert to meters
      // This handles backward compatibility with old data stored in millimeters
      if (stored.width > 100 || stored.height > 100 || stored.length > 100) {
        this.width = stored.width / 1000;
        this.height = stored.height / 1000;
        this.length = stored.length / 1000;
        // Save converted values back to storage
        this.saveToStorage();
      } else {
        this.width = stored.width;
        this.height = stored.height;
        this.length = stored.length;
      }
    }
  }

  saveToStorage(): void {
    saveToStorage<RoomDimensions>(STORAGE_KEYS.ROOM, {
      width: this.width,
      height: this.height,
      length: this.length,
    });
  }
}

