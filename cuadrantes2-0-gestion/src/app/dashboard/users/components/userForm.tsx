import { useForm, Controller } from "react-hook-form";
import {
  TextField,
  Button,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  OutlinedInput,
  FormHelperText,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { User } from "@/types/user";

interface Permiso {
  id: number;
  tipo: string;
}

interface UserFormData {
  username: string;
  email: string;
  password?: string;
  permisoIds: number[];
}

interface UserFormProps {
  onSubmit: (data: Partial<UserFormData>) => void;
  initialData?: User | null;
  isSubmitting: boolean;
}

const fetchPermissions = async (): Promise<Permiso[]> => {
  const { data } = await api.get("/permisos");
  return data;
};

const UserForm = ({ onSubmit, initialData, isSubmitting }: UserFormProps) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UserFormData>({
    defaultValues: initialData
      ? {
          ...initialData,
          permisoIds: initialData.permisos.map((p) => p.id),
        }
      : {
          username: "",
          email: "",
          password: "",
          permisoIds: [],
        },
  });

  const {
    data: allPermissions,
    isLoading: isLoadingPermissions,
    isError: isErrorPermissions,
  } = useQuery<Permiso[], Error>({
    queryKey: ["permissions"],
    queryFn: fetchPermissions,
  });

  const handleFormSubmit = (data: UserFormData) => {
    const dataToSubmit: Partial<UserFormData> = { ...data };
    // Do not send password if it's empty or just whitespace
    if (!dataToSubmit.password?.trim()) {
      delete dataToSubmit.password;
    }
    onSubmit(dataToSubmit);
  };

  const permissionsMap =
    allPermissions?.reduce((acc, perm) => {
      acc[perm.id] = perm.tipo;
      return acc;
    }, {} as Record<number, string>) || {};

  return (
    <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <TextField
        label="Username"
        {...register("username", {
          required: "El nombre de usuario es requerido",
        })}
        fullWidth
        margin="normal"
        error={!!errors.username}
        helperText={errors.username?.message}
        disabled={isSubmitting}
      />
      <TextField
        label="Email"
        type="email"
        {...register("email", {
          required: "El email es requerido",
          pattern: {
            value: /^\S+@\S+$/i,
            message: "Formato de email inválido",
          },
        })}
        fullWidth
        margin="normal"
        error={!!errors.email}
        helperText={errors.email?.message}
        disabled={isSubmitting}
      />
      <TextField
        label="Contraseña"
        placeholder={initialData ? "Dejar en blanco para no cambiar" : ""}
        type="password"
        {...register("password", {
          required: {
            value: !initialData, // Required only on creation
            message: "La contraseña es requerida",
          },
          minLength: {
            value: 6,
            message: "La contraseña debe tener al menos 6 caracteres",
          },
        })}
        fullWidth
        margin="normal"
        error={!!errors.password}
        helperText={errors.password?.message}
        disabled={isSubmitting}
        autoComplete="new-password"
      />

      {isLoadingPermissions ? (
        <CircularProgress />
      ) : isErrorPermissions ? (
        <Alert severity="error">Error al cargar los permisos.</Alert>
      ) : (
        <FormControl fullWidth margin="normal" error={!!errors.permisoIds}>
          <InputLabel id="permisos-select-label">Permisos</InputLabel>
          <Controller
            name="permisoIds"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                labelId="permisos-select-label"
                multiple
                input={<OutlinedInput label="Permisos" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {(selected as number[]).map((id) => (
                      <Chip key={id} label={permissionsMap[id] || id} />
                    ))}
                  </Box>
                )}
              >
                {allPermissions?.map((permiso) => (
                  <MenuItem key={permiso.id} value={permiso.id}>
                    {permiso.tipo}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
          {errors.permisoIds && (
            <FormHelperText>{errors.permisoIds.message}</FormHelperText>
          )}
        </FormControl>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        variant="contained"
        sx={{ mt: 2 }}
      >
        {isSubmitting ? <CircularProgress size={24} /> : "Guardar"}
      </Button>
    </Box>
  );
};
export default UserForm;
