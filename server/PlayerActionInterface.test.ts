import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerActionInterface, PlayerAction } from "./PlayerActionInterface";

describe("PlayerActionInterface", () => {
  const mockOnAction = vi.fn();
  const defaultProps = {
    currentPlayer: "UTG",
    currentPot: 600,
    currentBet: 400,
    minRaise: 800,
    onAction: mockOnAction,
    disabled: false,
  };

  it("renders all action buttons", () => {
    render(<PlayerActionInterface {...defaultProps} />);
    
    expect(screen.getByText("Fold")).toBeInTheDocument();
    expect(screen.getByText(/Call/)).toBeInTheDocument();
    expect(screen.getByText("Raise")).toBeInTheDocument();
    expect(screen.getByText("All-In")).toBeInTheDocument();
  });

  it("displays current player information", () => {
    render(<PlayerActionInterface {...defaultProps} />);
    
    expect(screen.getByText(/UTG/)).toBeInTheDocument();
    expect(screen.getByText(/600/)).toBeInTheDocument(); // pot
    expect(screen.getByText(/400/)).toBeInTheDocument(); // to call
  });

  it("calls onAction with fold action", () => {
    render(<PlayerActionInterface {...defaultProps} />);
    
    const foldButton = screen.getByText("Fold");
    fireEvent.click(foldButton);
    
    expect(mockOnAction).toHaveBeenCalledWith({
      player: "UTG",
      action: "fold",
      amount: undefined,
    });
  });

  it("calls onAction with call action", () => {
    render(<PlayerActionInterface {...defaultProps} />);
    
    const callButton = screen.getByText(/Call/);
    fireEvent.click(callButton);
    
    expect(mockOnAction).toHaveBeenCalledWith({
      player: "UTG",
      action: "call",
      amount: 400,
    });
  });

  it("calls onAction with raise action when amount is entered", () => {
    render(<PlayerActionInterface {...defaultProps} />);
    
    const raiseInput = screen.getByPlaceholderText(/Raise to/);
    fireEvent.change(raiseInput, { target: { value: "800" } });
    
    const raiseButton = screen.getByText("Raise");
    fireEvent.click(raiseButton);
    
    expect(mockOnAction).toHaveBeenCalledWith({
      player: "UTG",
      action: "raise",
      amount: 800,
    });
  });

  it("calls onAction with allin action", () => {
    render(<PlayerActionInterface {...defaultProps} />);
    
    const allinButton = screen.getByText("All-In");
    fireEvent.click(allinButton);
    
    expect(mockOnAction).toHaveBeenCalledWith({
      player: "UTG",
      action: "allin",
      amount: undefined,
    });
  });

  it("shows check button when currentBet is 0", () => {
    render(<PlayerActionInterface {...defaultProps} currentBet={0} />);
    
    expect(screen.getByText("Check")).toBeInTheDocument();
    expect(screen.queryByText(/Call/)).not.toBeInTheDocument();
  });

  it("disables buttons when disabled prop is true", () => {
    render(<PlayerActionInterface {...defaultProps} disabled={true} />);
    
    const foldButton = screen.getByText("Fold");
    expect(foldButton).toBeDisabled();
  });

  it("clears raise amount after action is taken", () => {
    render(<PlayerActionInterface {...defaultProps} />);
    
    const raiseInput = screen.getByPlaceholderText(/Raise to/) as HTMLInputElement;
    fireEvent.change(raiseInput, { target: { value: "800" } });
    expect(raiseInput.value).toBe("800");
    
    const raiseButton = screen.getByText("Raise");
    fireEvent.click(raiseButton);
    
    expect(raiseInput.value).toBe("");
  });

  it("validates minimum raise amount", () => {
    render(<PlayerActionInterface {...defaultProps} minRaise={800} />);
    
    const raiseInput = screen.getByPlaceholderText(/Raise to/);
    expect(raiseInput).toHaveAttribute("min", "800");
  });
});

describe("ActionHistory", () => {
  it("renders action history with multiple actions", () => {
    const actions: PlayerAction[] = [
      { player: "UTG", action: "fold" },
      { player: "UTG+1", action: "raise", amount: 800 },
      { player: "MP", action: "call", amount: 800 },
    ];
    
    const { ActionHistory } = require("./PlayerActionInterface");
    render(<ActionHistory actions={actions} />);
    
    expect(screen.getByText(/UTG/)).toBeInTheDocument();
    expect(screen.getByText(/Fold/)).toBeInTheDocument();
    expect(screen.getByText(/UTG\+1/)).toBeInTheDocument();
    expect(screen.getByText(/Raise/)).toBeInTheDocument();
    expect(screen.getByText(/800/)).toBeInTheDocument();
  });

  it("shows empty state when no actions", () => {
    const { ActionHistory } = require("./PlayerActionInterface");
    render(<ActionHistory actions={[]} />);
    
    expect(screen.getByText(/No actions yet/)).toBeInTheDocument();
  });
});
