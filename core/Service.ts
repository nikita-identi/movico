/**
 * Abstract `Service` class that provides a flexible and type-safe way to manage properties
 * and their validations, while supporting event hooks for property changes.
 *
 * @template ServiceProps - A record that defines the shape of the service properties.
 */
export default abstract class Service<ServiceProps extends Record<string, any> = Record<string, any>> {
    /**
     * Stores validation functions for specific properties.
     */
    private validators: Partial<Record<keyof ServiceProps, (value: ServiceProps[keyof ServiceProps]) => boolean>> = {};

    /**
     * Stores all properties managed by the service.
     */
    private properties: ServiceProps;

    /**
     * Creates an instance of the `Service` class.
     *
     * @param initialProps - Initial properties to populate the service.
     */
    constructor(initialProps: ServiceProps = {} as ServiceProps) {
        this.properties = initialProps;
    }

    /**
     * Sets the value of a property.
     *
     * @param key - The property key to set.
     * @param newValue - The new value to assign to the property.
     * @throws If the value fails validation.
     */
    setValue<PropKey extends keyof ServiceProps>(key: PropKey, newValue: ServiceProps[PropKey]): void {
        if (this.validators[key] && !this.validators[key]!(newValue)) {
            throw new Error(`Validation failed for property '${String(key)}'`);
        }
        this.properties[key] = newValue;
        this.onSet?.(key, newValue);
    }

    /**
     * Gets the value of a property.
     *
     * @param key - The property key to retrieve.
     * @returns The value of the property, or `null` if it doesn't exist.
     */
    getValue<PropKey extends keyof ServiceProps>(key: PropKey): ServiceProps[PropKey] | null {
        return this.properties[key] ?? null;
    }

    /**
     * Registers a validation function for a property.
     *
     * @param key - The property key for which to register the validator.
     * @param validator - A function to validate the property's value.
     */
    registerValidator<PropKey extends keyof ServiceProps>(
        key: PropKey,
        validator: (value: ServiceProps[PropKey]) => boolean
    ): void {
        this.validators[key] = validator as (value: ServiceProps[keyof ServiceProps]) => boolean;
    }

    /**
     * Dynamically adds a new property to the service.
     *
     * @param key - The new property key.
     * @param value - The value to assign to the new property.
     */
    setNewProp<PropKey extends string, Value extends ServiceProps[keyof ServiceProps]>(
        key: PropKey,
        value: Value
    ): void {
        (this.properties as any)[key] = value;
        this.onSet?.(key as keyof ServiceProps, value);
    }

    /**
     * Removes a property from the service.
     *
     * @param key - The property key to remove.
     */
    removeProp<PropKey extends keyof ServiceProps>(key: PropKey): void {
        delete this.properties[key];
        this.onRemove?.(key);
    }

    /**
     * Checks if a property exists in the service.
     *
     * @param key - The property key to check.
     * @returns `true` if the property exists, otherwise `false`.
     */
    hasProp<PropKey extends keyof ServiceProps>(key: PropKey): boolean {
        return key in this.properties;
    }

    /**
     * Retrieves all properties as a readonly object.
     *
     * @returns A readonly copy of all service properties.
     */
    getAllProps(): Readonly<ServiceProps> {
        return { ...this.properties };
    }

    /**
     * Resets all properties to their default state.
     *
     * @param defaultProps - An optional object specifying default properties to set.
     */
    resetProps(defaultProps: Partial<ServiceProps> = {}): void {
        this.properties = { ...defaultProps } as ServiceProps;
        this.onReset?.();
    }

    /**
     * Hook for handling events when a property is set.
     * Can be overridden in subclasses.
     *
     * @param key - The key of the property that was set.
     * @param value - The new value of the property.
     */
    protected abstract onSet?<PropKey extends keyof ServiceProps>(key: PropKey, value: ServiceProps[PropKey]): void;

    /**
     * Hook for handling events when a property is removed.
     * Can be overridden in subclasses.
     *
     * @param key - The key of the property that was removed.
     */
    protected abstract onRemove?<PropKey extends keyof ServiceProps>(key: PropKey): void;

    /**
     * Hook for handling events when all properties are reset.
     * Can be overridden in subclasses.
     */
    protected abstract onReset?(): void;
}
