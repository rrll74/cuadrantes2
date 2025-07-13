import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isSubmitting: boolean;
}

const ConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  isSubmitting,
}: ConfirmationDialogProps) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
    >
      <DialogTitle id="confirmation-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirmation-dialog-description">
          {description}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={onConfirm}
          disabled={isSubmitting}
          variant="contained"
          color="error"
        >
          {isSubmitting ? <CircularProgress size={24} /> : "Confirmar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
