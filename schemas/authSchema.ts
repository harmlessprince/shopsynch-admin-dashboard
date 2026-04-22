import {toTypedSchema} from '@vee-validate/zod';
import * as zod from 'zod';


export const LoginFormSchema = toTypedSchema(
    zod.object({
        email: zod.string().email({message: 'Must be a valid email'}),
        password: zod.string().min(4, {message: 'Too short: should at at least 4 characters'}),
    })
);


export const ForgotPasswordSchema = toTypedSchema(
    zod.object({
        email: zod.string().email({message: 'Must be a valid email'})
    })
);
export const ResetPasswordSchema = toTypedSchema(
    zod.object({
        newPassword: zod.string()
            .min(1, {message: 'Password is required'})
            .min(4, {message: 'Too short: should at at least 4 characters'}),
        confirmPassword: zod.string()
            .min(1, {message: 'Confirm password is required'})
    }).refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'], // <- this will associate the error with the confirm_password field
    })
);


export const ChangePasswordSchema = toTypedSchema(
    zod.object({
        currentPassword: zod.string().min(1, {message: 'Password is required'}).min(4, {message: 'Too short: should at at least 4 characters'}),
        newPassword: zod.string()
            .min(1, {message: 'Password is required'})
            .min(4, {message: 'Too short: should at at least 4 characters'}),
        confirmPassword: zod.string()
            .min(1, {message: 'Confirm password is required'})
    }).refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'], // <- this will associate the error with the confirm_password field
    })
);


export const RegisterFormSchema = toTypedSchema(
    zod.object({
        email: zod.string()
            .min(1, {message: 'Email is required'})
            .email({message: 'Must be a valid email'}),
        password: zod.string()
            .min(1, {message: 'Password is required'})
            .min(4, {message: 'Too short: should at at least 4 characters'}),
        confirmPassword: zod.string()
            .min(1, {message: 'Confirm password is required'}),
        storeName: zod.string()
            .min(1, {message: 'Business name is required'})
            .min(2, {message: 'Too short: should at at least 2 characters'}),
    }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'], // <- this will associate the error with the confirm_password field
    })
);
