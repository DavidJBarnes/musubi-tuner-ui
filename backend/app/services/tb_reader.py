import glob
import os

from ..schemas import LossPoint


def read_loss_curve(tensorboard_dir: str) -> list[LossPoint]:
    """Read loss values from TensorBoard event files."""
    if not tensorboard_dir or not os.path.isdir(tensorboard_dir):
        return []

    try:
        from tensorboard.backend.event_processing.event_accumulator import EventAccumulator

        # Find event files recursively
        event_files = glob.glob(os.path.join(tensorboard_dir, "**", "events.out.tfevents.*"), recursive=True)
        if not event_files:
            return []

        # Use the directory containing the most recent event file
        event_files.sort(key=os.path.getmtime)
        event_dir = os.path.dirname(event_files[-1])
        ea = EventAccumulator(event_dir)
        ea.Reload()

        points = []
        scalar_tags = ea.Tags().get("scalars", [])

        # Look for loss-related tags
        loss_tag = None
        for tag in scalar_tags:
            if "loss" in tag.lower():
                loss_tag = tag
                break

        if loss_tag:
            for event in ea.Scalars(loss_tag):
                points.append(LossPoint(step=event.step, value=event.value))

        return points
    except Exception:
        return []
