/*
 * Copyright 2016 Palantir Technologies, Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 - http://www.apache.org/licenses/LICENSE-2.0
 */

import * as classNames from "classnames";
import * as PureRender from "pure-render-decorator";
import * as React from "react";

import * as Classes from "../../common/classes";
import * as Errors from "../../common/errors";
import * as Keys from "../../common/keys";
import { HTMLInputProps, IIntentProps, IProps, removeNonHTMLProps } from "../../common/props";

import { Button } from "../button/buttons";
import { InputGroup } from "./inputGroup";

export type ButtonPosition = "none" | "left" | "right" | "split";

export interface INumericStepperProps extends IIntentProps, IProps {

    /**
     * The button configuration with respect to the input field.
     * @default "right"
     */
    buttonPosition?: ButtonPosition;

    /**
     * Whether the input is non-interactive.
     * @default false
     */
    disabled?: boolean;

    /** Ref handler that receives HTML `<input>` element backing this component. */
    inputRef?: (ref: HTMLInputElement) => any;

    /** Name of icon (the part after `pt-icon-`) to render on left side of input. */
    leftIconName?: string;

    /** Placeholder text in the absence of any value. */
    placeholder?: string;

    /**
     * Increment between successive values when `shift` is held.
     * @default 10
     */
    majorStepSize?: number;

    /** Maximum value of the input. */
    max?: number;

    /** Minimum value of the input. */
    min?: number;

    /**
     * Increment between successive values when `alt` is held.
     * @default 0.1
     */
    minorStepSize?: number;

    /**
     * Increment between successive values when no modifier keys are held.
     * @default 1
     */
    stepSize?: number;

    /**
     * Value to display in the input field
     * @default ""
     */
    value?: number | string;

    /** Callback invoked when the value changes. */
    onChange?(value: string): void;
}

export interface INumericStepperState {
    shouldSelectAfterUpdate?: boolean;
    value?: string;
}

@PureRender
export class NumericStepper extends React.Component<HTMLInputProps & INumericStepperProps, INumericStepperState> {
    public static displayName = "Blueprint.NumericStepper";

    public static defaultProps: INumericStepperProps = {
        buttonPosition: "right",
        majorStepSize: 10,
        minorStepSize: 0.1,
        stepSize: 1,
        value: NumericStepper.VALUE_EMPTY,
    };

    private static DECREMENT_KEY = "decrement";
    private static INCREMENT_KEY = "increment";
    private static DECREMENT_ICON_NAME = "minus";
    private static INCREMENT_ICON_NAME = "plus";
    private static VALUE_EMPTY = "";
    private static VALUE_ZERO = "0";

    private inputElement: HTMLInputElement;

    public constructor(props?: HTMLInputProps & INumericStepperProps) {
        super(props);
        this.validateProps(props);
        this.state = {
            shouldSelectAfterUpdate: false,
            value: this.getValueOrEmptyValue(props),
        };
    }

    public render() {
        const { className } = this.props;

        const inputGroup = this.renderInputGroup();
        const decrementButton = this.renderButton(
            NumericStepper.DECREMENT_KEY, NumericStepper.DECREMENT_ICON_NAME, this.handleDecrementButtonClick);
        const incrementButton = this.renderButton(
            NumericStepper.INCREMENT_KEY, NumericStepper.INCREMENT_ICON_NAME, this.handleIncrementButtonClick);

        const elems = this.sortElements(inputGroup, incrementButton, decrementButton);
        const classes = classNames(Classes.CONTROL_GROUP, className);

        return <div className={classes}>{elems}</div>;
    }

    public componentWillReceiveProps(nextProps: HTMLInputProps & INumericStepperProps) {
        this.validateProps(nextProps);

        const nextValue = this.getValueOrEmptyValue(nextProps);

        if (nextValue != null) {
            this.setState({ value: nextValue });
        }
    }

    public componentDidUpdate() {
        if (this.state.shouldSelectAfterUpdate) {
            this.inputElement.setSelectionRange(0, this.state.value.length);
        }
    }

    private validateProps(nextProps: HTMLInputProps & INumericStepperProps) {
        const { majorStepSize, max, min, minorStepSize, stepSize } = nextProps;
        if (min && max && min >= max) {
            throw new Error(Errors.NUMERIC_STEPPER_MIN_MAX);
        }
        if (minorStepSize <= 0) {
            throw new Error(Errors.NUMERIC_STEPPER_MINOR_STEP_SIZE_NON_POSITIVE);
        }
        if (majorStepSize <= 0) {
            throw new Error(Errors.NUMERIC_STEPPER_MAJOR_STEP_SIZE_NON_POSITIVE);
        }
        if (stepSize <= 0) {
            throw new Error(Errors.NUMERIC_STEPPER_STEP_SIZE_NON_POSITIVE);
        }
        if (minorStepSize > stepSize) {
            throw new Error(Errors.NUMERIC_STEPPER_MINOR_STEP_SIZE_BOUND);
        }
        if (majorStepSize < stepSize) {
            throw new Error(Errors.NUMERIC_STEPPER_MAJOR_STEP_SIZE_BOUND);
        }
    }

    private renderInputGroup() {
        return (
            <InputGroup
                {...removeNonHTMLProps(this.props)}
                intent={this.props.intent}
                inputRef={this.inputRef}
                key="input-group"
                leftIconName={this.props.leftIconName}
                onChange={this.handleInputChange}
                onKeyDown={this.handleKeyDown}
                value={this.state.value}
            />
        );
    }

    private renderButton(key: string, iconName: string, onClick: React.MouseEventHandler<HTMLElement>) {
        return (
            <Button
                disabled={this.props.disabled || this.props.readOnly}
                iconName={iconName}
                intent={this.props.intent}
                key={key}
                onClick={onClick}
            />
        );
    }

    private inputRef = (input: HTMLInputElement) => {
        this.inputElement = input;
    }

    private handleDecrementButtonClick = (e: React.MouseEvent<HTMLInputElement>) => {
        this.updateValue(-1, e);
    }

    private handleIncrementButtonClick = (e: React.MouseEvent<HTMLInputElement>) => {
        this.updateValue(+1, e);
    }

    private handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (this.props.disabled || this.props.readOnly) {
            return;
        }

        const { keyCode } = e;

        let direction: number;

        if (keyCode === Keys.ARROW_UP) {
            direction = 1;
        } else if (keyCode === Keys.ARROW_DOWN) {
            direction = -1;
        } else {
            return;
        }

        // we'd like to select the field contents after running the code in this
        // onKeyDown handler, as a UX nicety. without e.preventDefault, some
        // hotkeys (e.g. shift + up/down, alt + up/down) will clear the selection,
        // resulting in an inconsistent or unintuitive experience.
        e.preventDefault();

        this.updateValue(direction, e);
    }

    private handleInputChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const nextValue = (e.target as HTMLInputElement).value;
        this.setState({ shouldSelectAfterUpdate : false, value: nextValue });

        this.invokeOnChangeCallback(nextValue);
    }

    private updateValue(direction: number, e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) {
        let delta = this.props.stepSize * direction;

        // if both `alt` and `shift` are pressed, `shift` takes precedence
        if (e.shiftKey) {
            delta *= this.props.majorStepSize;
        } else if (e.altKey) {
            delta *= this.props.minorStepSize;
        }

        // pretend we're incrementing from 0 if currValue isn't defined
        const currValue = this.state.value || NumericStepper.VALUE_ZERO;

        // truncate floating-point result to avoid precision issues when adding
        // binary-unfriendly deltas like 0.1
        let nextValue = (!this.isValueNumeric(currValue))
            ? 0
            : parseFloat((parseFloat(currValue) + delta).toFixed(2));

        const { max, min } = this.props;

        if (min != null) {
            nextValue = Math.max(nextValue, min);
        }
        if (max != null) {
            nextValue = Math.min(nextValue, max);
        }

        const nextValueString = nextValue.toString();
        this.setState({ shouldSelectAfterUpdate : true, value: nextValueString });

        this.invokeOnChangeCallback(nextValueString);
    }

    private isValueNumeric(value: string) {
        // checking if a string is numeric in Typescript is a big pain, because
        // we can't simply toss a string parameter to isFinite. below is the
        // essential approach that jQuery uses, which involves subtracting a
        // parsed numeric value from the string representation of the value. we
        // need to cast the value to the `any` type to allow this operation
        // between dissimilar types.
        return value != null && ((value as any) - parseFloat(value) + 1) >= 0;
    }

    private sortElements(inputGroup: JSX.Element, incrementButton: JSX.Element, decrementButton: JSX.Element) {
        switch (this.props.buttonPosition) {
            case "left":
                return [decrementButton, incrementButton, inputGroup];
            case "split":
                return [decrementButton, inputGroup, incrementButton];
            case "right":
                return [inputGroup, decrementButton, incrementButton];
            default:
                // don't include the buttons.
                return [inputGroup];
        }
    }

    private getValueOrEmptyValue(props: INumericStepperProps) {
        return (props.value != null)
            ? props.value.toString()
            : NumericStepper.VALUE_EMPTY;
    }

    private invokeOnChangeCallback(value: string) {
        if (this.props.onChange) {
            this.props.onChange(value);
        }
    }
}

export const NumericStepperFactory = React.createFactory(NumericStepper);