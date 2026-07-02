// Pulls the @testing-library/jest-dom matcher augmentations (toBeInTheDocument,
// toHaveAttribute, …) into the TypeScript program. jest.setup.ts imports the
// runtime, but it lives outside `src`, so the type augmentation is referenced
// here to keep it inside the app's tsconfig `include`.
import "@testing-library/jest-dom";
