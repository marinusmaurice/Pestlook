namespace Pestlook.UI.Mobile.Services;

public enum ToastType { Info, Success, Error }

public record ToastMessage(string Text, ToastType Type);

public class ToastService
{
    public event Action<ToastMessage>? OnShow;

    public void Show(string text, ToastType type = ToastType.Info)
        => OnShow?.Invoke(new ToastMessage(text, type));

    public void ShowSuccess(string text) => Show(text, ToastType.Success);
    public void ShowError(string text)   => Show(text, ToastType.Error);
}
