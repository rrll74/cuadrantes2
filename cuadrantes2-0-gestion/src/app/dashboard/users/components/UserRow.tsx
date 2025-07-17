import { TableCell, Chip, Box, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { User } from "@/types/user";

interface UserRowProps {
  user: User;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (user: User) => void;
  onDelete: (id: number) => void;
}

export const UserRow: React.FC<UserRowProps> = ({
  user,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}) => {
  return (
    <>
      <TableCell component="th" scope="row">
        {user.id}
      </TableCell>
      <TableCell>{user.username}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell align="center">
        {user.banned ? (
          <Chip label="Baneado" color="error" size="small" />
        ) : user.activated ? (
          <Chip label="Activo" color="success" size="small" />
        ) : (
          <Chip label="Inactivo" color="warning" size="small" />
        )}
      </TableCell>
      <TableCell>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {user.permisos.map((permiso) => (
            <Chip
              key={permiso.id}
              label={permiso.tipo}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      </TableCell>

      <TableCell align="center">
        {canUpdate && (
          <IconButton onClick={() => onEdit(user)}>
            <EditIcon />
          </IconButton>
        )}
        {canDelete && (
          <IconButton onClick={() => onDelete(user.id)}>
            <DeleteIcon />
          </IconButton>
        )}
      </TableCell>
    </>
  );
};
