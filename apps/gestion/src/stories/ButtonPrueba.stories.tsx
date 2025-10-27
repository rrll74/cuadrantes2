import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ButtonPrueba } from "@/components/ButtonPrueba/ButtonPrueba";

// 1. La configuración Meta (el "qué" y "dónde")
// Esto le dice a Storybook cómo agrupar y nombrar tu componente en la barra lateral.
const meta: Meta<typeof ButtonPrueba> = {
  title: "UI/ButtonPrueba", // La ruta en la barra lateral de Storybook
  component: ButtonPrueba,
  parameters: {
    layout: "centered", // Centra el componente en el canvas
  },
  tags: ["autodocs"], // Habilita la generación automática de documentación
  argTypes: {
    // Configura los controles para cada prop
    variant: {
      control: "select",
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
      ],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
  },
};

export default meta;

// 2. Las Historias (el "cómo")
// Cada exportación nombrada es una variante diferente de tu componente.
type Story = StoryObj<typeof meta>;

// La historia principal o por defecto
export const Primary: Story = {
  args: {
    variant: "default",
    children: "Button",
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Delete",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Cancel",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    children: "Large Button",
  },
};
