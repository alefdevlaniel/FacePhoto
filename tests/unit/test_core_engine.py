"""
Testes unitários automatizados para o Core Engine do FacePhoto (Etapa 2).
"""

from pathlib import Path
import tempfile
import unittest
from PIL import Image
from src.backend.core.duplicate_detector import (
    calculate_perceptual_hash,
    filter_unique_images,
)
from src.backend.core.face_engine import FaceBoundingBox, MockFaceEngine
from src.backend.core.file_copy_manager import (
    copy_file_preserve_metadata,
    resolve_destination_path,
)
from src.backend.core.file_scanner import (
    count_supported_images,
    has_supported_extension,
    is_supported_image,
    scan_directory_batches,
    scan_directory_stream,
)

from src.backend.core.hardware_detector import detect_hardware
from src.backend.core.result_ranker import MatchStatus, classify_match


class TestCoreEngine(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    # --- Hardware Detector ---
    def test_hardware_detector(self):
        info = detect_hardware()
        self.assertIn(info.device_type, ["cuda", "mps", "cpu"])
        self.assertTrue(isinstance(info.name, str))

    # --- File Scanner ---
    def test_file_scanner_supported_formats(self):
        self.assertTrue(has_supported_extension(Path("foto.jpg")))
        self.assertTrue(has_supported_extension(Path("foto.png")))
        self.assertTrue(has_supported_extension(Path("foto.webp")))
        self.assertTrue(has_supported_extension(Path("foto.heic")))
        self.assertTrue(has_supported_extension(Path("foto.cr2")))
        self.assertFalse(has_supported_extension(Path("documento.pdf")))

        # Testar is_supported_image com arquivo real em disco
        real_file = self.temp_path / "real_photo.jpg"
        real_file.touch()
        self.assertTrue(is_supported_image(real_file))
        self.assertFalse(is_supported_image(self.temp_path / "inexistente.jpg"))

    def test_file_scanner_streaming_and_batching(self):
        # Criar fotos fictícias
        (self.temp_path / "img1.jpg").touch()
        (self.temp_path / "img2.png").touch()
        (self.temp_path / "doc.txt").touch()

        sub_dir = self.temp_path / "sub"
        sub_dir.mkdir()
        (sub_dir / "img3.webp").touch()

        # Testar streaming
        found = list(scan_directory_stream(self.temp_path))
        self.assertEqual(len(found), 3)

        # Testar contagem
        total = count_supported_images(self.temp_path)
        self.assertEqual(total, 3)

        # Testar lotes (batching)
        batches = list(scan_directory_batches(self.temp_path, batch_size=2))
        self.assertEqual(len(batches), 2)
        self.assertEqual(len(batches[0]), 2)
        self.assertEqual(len(batches[1]), 1)

    # --- Duplicate Detector ---
    def test_duplicate_detector(self):
        img1_path = self.temp_path / "pic1.png"
        img2_path = self.temp_path / "pic2.png"

        # Criar duas imagens idênticas
        img = Image.new("RGB", (50, 50), color="blue")
        img.save(img1_path)
        img.save(img2_path)

        hash1 = calculate_perceptual_hash(img1_path)
        hash2 = calculate_perceptual_hash(img2_path)
        self.assertEqual(hash1, hash2)

        unique, dups = filter_unique_images([img1_path, img2_path])
        self.assertEqual(len(unique), 1)
        self.assertEqual(len(dups), 1)

    # --- Face Engine (Mock) ---
    def test_mock_face_engine(self):
        engine = MockFaceEngine()
        img_path = self.temp_path / "test_face.jpg"
        img_path.touch()

        results = engine.detect_and_extract(img_path)
        self.assertEqual(len(results), 1)
        self.assertEqual(len(results[0].embedding), 128)
        self.assertEqual(results[0].bounding_box.to_dict(), {"x": 50, "y": 50, "w": 100, "h": 100})

        # Testar cálculo de similaridade de cosseno
        sim_same = engine.calculate_similarity(results[0].embedding, results[0].embedding)
        self.assertAlmostEqual(sim_same, 1.0, places=4)

    # --- Result Ranker ---
    def test_result_ranker_classification(self):
        self.assertEqual(classify_match(0.92, threshold=0.60), MatchStatus.CONFIRMADO)
        self.assertEqual(classify_match(0.60, threshold=0.60), MatchStatus.CONFIRMADO)
        self.assertEqual(classify_match(0.55, threshold=0.60), MatchStatus.REVISAO_MANUAL)
        self.assertEqual(classify_match(0.35, threshold=0.60), MatchStatus.REVISAO_MANUAL)
        self.assertEqual(classify_match(0.30, threshold=0.60), MatchStatus.DESCARTADO)

    # --- File Copy Manager ---
    def test_file_copy_manager_resolution_and_copy(self):
        dest_dir = self.temp_path / "destino"
        dest_dir.mkdir()

        # Testar resolução de colisão de nomes
        (dest_dir / "foto.jpg").touch()
        resolved = resolve_destination_path(dest_dir, "foto.jpg")
        self.assertEqual(resolved.name, "foto_2.jpg")

        # Testar cópia real de arquivo
        src_file = self.temp_path / "origem.png"
        img = Image.new("RGB", (30, 30), color="red")
        img.save(src_file)

        res = copy_file_preserve_metadata(src_file, dest_dir, subfolder_name="Vó Maria")
        self.assertTrue(res.sucesso)
        self.assertTrue(res.caminho_destino.exists())
        self.assertEqual(res.caminho_destino.parent.name, "Vó Maria")


if __name__ == "__main__":
    unittest.main()
