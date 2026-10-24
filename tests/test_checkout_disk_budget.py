# Standard Library
import subprocess

# Local
import file_utils


MAX_CHECKOUT_SIZE_KIB = 20 * 1024 * 1024


#============================================
def checkout_size_kib(repo_root: str) -> int:
	"""Return the physical checkout usage in KiB, matching ``du -sh`` scope."""
	import os
	import shutil
	du_bin = shutil.which("du")
	if du_bin:
		result = subprocess.run(
			[du_bin, "-sk", repo_root],
			check=True,
			capture_output=True,
			text=True,
		)
		return int(result.stdout.split(maxsplit=1)[0])
	total_bytes = 0
	for dirpath, _dirnames, filenames in os.walk(repo_root):
		for f in filenames:
			try:
				total_bytes += os.path.getsize(os.path.join(dirpath, f))
			except OSError:
				pass
	return total_bytes // 1024


#============================================
def test_checkout_disk_usage_stays_under_20_gib() -> None:
	"""Keep generated build data from consuming the developer volume."""
	repo_root = file_utils.get_repo_root()
	actual_kib = checkout_size_kib(repo_root)
	assert actual_kib <= MAX_CHECKOUT_SIZE_KIB, (
		"checkout disk usage is "
		f"{actual_kib / (1024 * 1024):.1f} GiB; the budget is 20.0 GiB. "
		"Remove stale generated build outputs before continuing."
	)
# Vendored pytest file. Local changes can and will be overwritten.
