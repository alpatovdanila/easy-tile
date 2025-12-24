import { makeAutoObservable } from 'mobx';

export class SceneModel {
  isDragging: boolean = false;
  rotationX: number = 0;
  rotationY: number = 0;

  constructor() {
    makeAutoObservable(this);
    this.loadFromStorage();
  }

  startDrag(): void {
    this.isDragging = true;
  }

  endDrag(): void {
    this.isDragging = false;
  }

  updateRotation(x: number, y: number): void {
    this.rotationX = x;
    this.rotationY = y;
  }

  resetRotation(): void {
    this.rotationX = 0;
    this.rotationY = 0;
    this.saveToStorage();
  }

  loadFromStorage(): void {
    // Optional for MVP - can be implemented later
  }

  saveToStorage(): void {
    // Optional for MVP - can be implemented later
  }
}

